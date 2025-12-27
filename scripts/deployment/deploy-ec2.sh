#!/bin/bash
# Automated EC2 Deployment Script for Camera First Fitness
# Usage: ./deploy-ec2.sh [setup|deploy|update|destroy]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
export AWS_REGION=${AWS_REGION:-us-east-1}
STACK_NAME="fitness-app-infrastructure"
KEY_NAME="fitness-app-key"
INSTANCE_TYPE="t3.medium"

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed. Install from: https://aws.amazon.com/cli/"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run: aws configure"
        exit 1
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed. Install from: https://docker.com"
        exit 1
    fi

    # Check Gradle
    if [ ! -f "../gradlew" ]; then
        log_error "Gradle wrapper not found. Run from aws/ directory"
        exit 1
    fi

    log_info "Prerequisites check passed!"
}

load_env() {
    if [ -f ".env.deploy" ]; then
        log_info "Loading environment variables from .env.deploy"
        export $(grep -v '^#' .env.deploy | xargs)
    else
        log_warn ".env.deploy not found. Creating template..."
        cat > .env.deploy << 'EOF'
# AWS Configuration
AWS_REGION=us-east-1
INSTANCE_TYPE=t3.medium

# Database Configuration
DB_INSTANCE_CLASS=db.t3.micro
DB_ALLOCATED_STORAGE=20
DB_ENGINE_VERSION=16.1

# Redis Configuration
REDIS_NODE_TYPE=cache.t3.micro

# API Keys (REQUIRED)
OPENAI_API_KEY=
SPOONACULAR_API_KEY=
YOUTUBE_API_KEY=

# Optional: Custom Domain
DOMAIN_NAME=

# Optional: Email for Alerts
ALERT_EMAIL=
EOF
        log_error "Please edit .env.deploy with your configuration and run again"
        exit 1
    fi
}

setup_infrastructure() {
    log_info "Setting up AWS infrastructure..."

    check_prerequisites
    load_env

    # Validate required variables
    if [ -z "$SPOONACULAR_API_KEY" ] || [ -z "$YOUTUBE_API_KEY" ]; then
        log_error "Missing required API keys (SPOONACULAR_API_KEY, YOUTUBE_API_KEY) in .env.deploy"
        exit 1
    fi

    # OpenAI is optional
    if [ -z "$OPENAI_API_KEY" ]; then
        log_warn "OpenAI API key not provided - AI features will be disabled"
    fi

    # Get AWS Account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account: $AWS_ACCOUNT_ID"
    log_info "AWS Region: $AWS_REGION"

    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    log_info "Generated database password (save this): $DB_PASSWORD"
    echo "$DB_PASSWORD" > .db-password
    chmod 600 .db-password

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 64)

    # Create VPC
    log_info "Creating VPC..."
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=fitness-app-vpc}]' \
        --query 'Vpc.VpcId' \
        --output text)

    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
    log_info "VPC created: $VPC_ID"

    # Create Internet Gateway
    log_info "Creating Internet Gateway..."
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=fitness-app-igw}]' \
        --query 'InternetGateway.InternetGatewayId' \
        --output text)

    aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID
    log_info "Internet Gateway created: $IGW_ID"

    # Create subnets
    log_info "Creating subnets..."
    PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.1.0/24 \
        --availability-zone ${AWS_REGION}a \
        --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-public-subnet}]' \
        --query 'Subnet.SubnetId' \
        --output text)

    aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_ID --map-public-ip-on-launch

    PRIVATE_SUBNET_1_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.2.0/24 \
        --availability-zone ${AWS_REGION}a \
        --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-private-subnet-1}]' \
        --query 'Subnet.SubnetId' \
        --output text)

    PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.3.0/24 \
        --availability-zone ${AWS_REGION}b \
        --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=fitness-app-private-subnet-2}]' \
        --query 'Subnet.SubnetId' \
        --output text)

    log_info "Subnets created"

    # Create route table
    log_info "Configuring routing..."
    ROUTE_TABLE_ID=$(aws ec2 create-route-table \
        --vpc-id $VPC_ID \
        --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=fitness-app-public-rt}]' \
        --query 'RouteTable.RouteTableId' \
        --output text)

    aws ec2 create-route \
        --route-table-id $ROUTE_TABLE_ID \
        --destination-cidr-block 0.0.0.0/0 \
        --gateway-id $IGW_ID

    aws ec2 associate-route-table \
        --subnet-id $PUBLIC_SUBNET_ID \
        --route-table-id $ROUTE_TABLE_ID

    # Create security groups
    log_info "Creating security groups..."

    MY_IP=$(curl -s https://checkip.amazonaws.com)

    APP_SG_ID=$(aws ec2 create-security-group \
        --group-name fitness-app-ec2-sg \
        --description "Security group for Fitness App EC2" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)

    # SSH access from your IP only
    aws ec2 authorize-security-group-ingress \
        --group-id $APP_SG_ID \
        --protocol tcp --port 22 --cidr ${MY_IP}/32

    # HTTP/HTTPS from anywhere
    aws ec2 authorize-security-group-ingress \
        --group-id $APP_SG_ID \
        --protocol tcp --port 80 --cidr 0.0.0.0/0

    aws ec2 authorize-security-group-ingress \
        --group-id $APP_SG_ID \
        --protocol tcp --port 443 --cidr 0.0.0.0/0

    # App port
    aws ec2 authorize-security-group-ingress \
        --group-id $APP_SG_ID \
        --protocol tcp --port 8080 --cidr 0.0.0.0/0

    DB_SG_ID=$(aws ec2 create-security-group \
        --group-name fitness-app-rds-sg \
        --description "Security group for Fitness App RDS" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)

    aws ec2 authorize-security-group-ingress \
        --group-id $DB_SG_ID \
        --protocol tcp --port 5432 --source-group $APP_SG_ID

    REDIS_SG_ID=$(aws ec2 create-security-group \
        --group-name fitness-app-redis-sg \
        --description "Security group for Fitness App Redis" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)

    aws ec2 authorize-security-group-ingress \
        --group-id $REDIS_SG_ID \
        --protocol tcp --port 6379 --source-group $APP_SG_ID

    log_info "Security groups created"

    # Create SSH key pair
    if [ ! -f "~/.ssh/${KEY_NAME}.pem" ]; then
        log_info "Creating SSH key pair..."
        aws ec2 create-key-pair \
            --key-name $KEY_NAME \
            --query 'KeyMaterial' \
            --output text > ~/.ssh/${KEY_NAME}.pem
        chmod 400 ~/.ssh/${KEY_NAME}.pem
        log_info "SSH key saved to ~/.ssh/${KEY_NAME}.pem"
    fi

    # Create RDS
    log_info "Creating RDS PostgreSQL (this takes 5-10 minutes)..."

    aws rds create-db-subnet-group \
        --db-subnet-group-name fitness-app-db-subnet-group \
        --db-subnet-group-description "Subnet group for Fitness App RDS" \
        --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID

    aws rds create-db-instance \
        --db-instance-identifier fitness-app-db \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine postgres \
        --engine-version $DB_ENGINE_VERSION \
        --master-username fitnessadmin \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage $DB_ALLOCATED_STORAGE \
        --storage-type gp3 \
        --vpc-security-group-ids $DB_SG_ID \
        --db-subnet-group-name fitness-app-db-subnet-group \
        --backup-retention-period 7 \
        --db-name fitness_mvp \
        --storage-encrypted \
        --no-publicly-accessible

    # Create Redis
    log_info "Creating ElastiCache Redis (this takes 5-10 minutes)..."

    aws elasticache create-cache-subnet-group \
        --cache-subnet-group-name fitness-app-redis-subnet-group \
        --cache-subnet-group-description "Subnet group for Fitness App Redis" \
        --subnet-ids $PRIVATE_SUBNET_1_ID $PRIVATE_SUBNET_2_ID

    aws elasticache create-cache-cluster \
        --cache-cluster-id fitness-app-redis \
        --cache-node-type $REDIS_NODE_TYPE \
        --engine redis \
        --engine-version 7.0 \
        --num-cache-nodes 1 \
        --cache-subnet-group-name fitness-app-redis-subnet-group \
        --security-group-ids $REDIS_SG_ID

    # Wait for RDS
    log_info "Waiting for RDS to be available..."
    aws rds wait db-instance-available --db-instance-identifier fitness-app-db

    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier fitness-app-db \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)

    log_info "RDS ready: $DB_ENDPOINT"

    # Wait for Redis
    log_info "Waiting for Redis to be available..."
    aws elasticache wait cache-cluster-available --cache-cluster-id fitness-app-redis

    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id fitness-app-redis \
        --show-cache-node-info \
        --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
        --output text)

    log_info "Redis ready: $REDIS_ENDPOINT"

    # Create EC2 user data
    cat > ec2-user-data.sh << 'USERDATA'
#!/bin/bash
set -e
dnf update -y
dnf install -y docker git java-21-amazon-corretto-headless postgresql15 redis6 htop
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
mkdir -p /opt/fitness-app
chown ec2-user:ec2-user /opt/fitness-app
USERDATA

    # Launch EC2
    log_info "Launching EC2 instance..."

    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=al2023-ami-2023.*-x86_64" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text)

    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $APP_SG_ID \
        --subnet-id $PUBLIC_SUBNET_ID \
        --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=fitness-app-server}]' \
        --user-data file://ec2-user-data.sh \
        --query 'Instances[0].InstanceId' \
        --output text)

    log_info "EC2 instance launching: $INSTANCE_ID"

    # Wait for instance
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID

    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)

    # Save configuration
    cat > .infrastructure.env << EOF
VPC_ID=$VPC_ID
PUBLIC_SUBNET_ID=$PUBLIC_SUBNET_ID
PRIVATE_SUBNET_1_ID=$PRIVATE_SUBNET_1_ID
PRIVATE_SUBNET_2_ID=$PRIVATE_SUBNET_2_ID
APP_SG_ID=$APP_SG_ID
DB_SG_ID=$DB_SG_ID
REDIS_SG_ID=$REDIS_SG_ID
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
DB_ENDPOINT=$DB_ENDPOINT
REDIS_ENDPOINT=$REDIS_ENDPOINT
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
EOF

    log_info "Infrastructure setup complete!"
    echo ""
    echo "============================================"
    echo "SAVE THESE CREDENTIALS SECURELY:"
    echo "============================================"
    echo "EC2 Public IP: $PUBLIC_IP"
    echo "EC2 Instance ID: $INSTANCE_ID"
    echo "SSH Command: ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo ""
    echo "Database Endpoint: $DB_ENDPOINT"
    echo "Database Username: fitnessadmin"
    echo "Database Password: $DB_PASSWORD"
    echo "Database Name: fitness_mvp"
    echo ""
    echo "Redis Endpoint: $REDIS_ENDPOINT:6379"
    echo ""
    echo "Configuration saved to .infrastructure.env"
    echo "============================================"
    echo ""
    echo "Next steps:"
    echo "1. Wait 2-3 minutes for EC2 initialization"
    echo "2. Run: ./deploy-ec2.sh deploy"
}

deploy_application() {
    log_info "Deploying application..."

    if [ ! -f ".infrastructure.env" ]; then
        log_error "Infrastructure not set up. Run: ./deploy-ec2.sh setup"
        exit 1
    fi

    source .infrastructure.env
    load_env

    # Build application
    log_info "Building application..."
    cd ..
    ./gradlew clean build -x test
    cd aws

    # Create deployment package
    log_info "Creating deployment package..."
    tar -czf fitness-app-deploy.tar.gz \
        -C .. \
        build/libs/backend-0.0.1-SNAPSHOT.jar \
        Dockerfile \
        src/main/resources/application.yml

    # Wait for EC2 to be ready
    log_info "Waiting for EC2 to be ready (checking every 10 seconds)..."
    for i in {1..18}; do
        if ssh -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP "which docker" &> /dev/null; then
            log_info "EC2 is ready!"
            break
        fi
        if [ $i -eq 18 ]; then
            log_error "EC2 not ready after 3 minutes. Please check manually."
            exit 1
        fi
        sleep 10
    done

    # Copy files to EC2
    log_info "Uploading application to EC2..."
    scp -i ~/.ssh/${KEY_NAME}.pem -o StrictHostKeyChecking=no \
        fitness-app-deploy.tar.gz \
        ec2-user@$PUBLIC_IP:/opt/fitness-app/

    # Create environment file on EC2
    log_info "Configuring environment..."
    ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP << EOF
cd /opt/fitness-app
tar -xzf fitness-app-deploy.tar.gz

# Create .env file
cat > .env << 'ENVFILE'
SPRING_DATASOURCE_URL=jdbc:postgresql://${DB_ENDPOINT}:5432/fitness_mvp
SPRING_DATASOURCE_USERNAME=fitnessadmin
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
SPRING_DATA_REDIS_HOST=${REDIS_ENDPOINT}
SPRING_DATA_REDIS_PORT=6379
SPOONACULAR_API_KEY=${SPOONACULAR_API_KEY}
YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
# OpenAI is optional - only enable if key is provided
OPENAI_ENABLED=${OPENAI_ENABLED:-false}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
APP_SEED_ENABLED=true
JWT_SECRET=${JWT_SECRET}
ENVFILE

# Create docker-compose file
cat > docker-compose.yml << 'COMPOSE'
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fitness-app
    ports:
      - "8080:8080"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
COMPOSE

# Build and start
docker-compose up -d --build
EOF

    # Wait for application to start
    log_info "Waiting for application to start..."
    sleep 60

    # Check health
    if curl -f http://$PUBLIC_IP:8080/actuator/health &> /dev/null; then
        log_info "Deployment successful!"
        echo ""
        echo "============================================"
        echo "APPLICATION DEPLOYED SUCCESSFULLY!"
        echo "============================================"
        echo "Health Check: http://$PUBLIC_IP:8080/actuator/health"
        echo "API Base URL: http://$PUBLIC_IP:8080"
        echo "API Docs: http://$PUBLIC_IP:8080/swagger-ui.html"
        echo "============================================"
    else
        log_error "Health check failed. Checking logs..."
        ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP "cd /opt/fitness-app && docker-compose logs --tail=50"
        exit 1
    fi
}

update_application() {
    log_info "Updating application..."

    if [ ! -f ".infrastructure.env" ]; then
        log_error "Infrastructure not set up. Run: ./deploy-ec2.sh setup"
        exit 1
    fi

    source .infrastructure.env

    # Build new version
    log_info "Building new version..."
    cd ..
    ./gradlew clean build -x test
    cd aws

    # Upload new JAR
    log_info "Uploading new version..."
    scp -i ~/.ssh/${KEY_NAME}.pem \
        ../build/libs/backend-0.0.1-SNAPSHOT.jar \
        ec2-user@$PUBLIC_IP:/opt/fitness-app/build/libs/

    # Restart application
    log_info "Restarting application..."
    ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP << 'EOF'
cd /opt/fitness-app
docker-compose down
docker-compose up -d --build
EOF

    sleep 30

    if curl -f http://$PUBLIC_IP:8080/actuator/health &> /dev/null; then
        log_info "Update successful!"
    else
        log_error "Update failed. Check logs with: ./deploy-ec2.sh logs"
        exit 1
    fi
}

destroy_infrastructure() {
    log_warn "This will destroy all resources. Are you sure? (yes/no)"
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Cancelled"
        exit 0
    fi

    if [ ! -f ".infrastructure.env" ]; then
        log_error "No infrastructure found"
        exit 1
    fi

    source .infrastructure.env

    log_info "Destroying infrastructure..."

    # Terminate EC2
    aws ec2 terminate-instances --instance-ids $INSTANCE_ID || true
    aws ec2 wait instance-terminated --instance-ids $INSTANCE_ID || true

    # Delete RDS
    aws rds delete-db-instance \
        --db-instance-identifier fitness-app-db \
        --skip-final-snapshot || true

    # Delete Redis
    aws elasticache delete-cache-cluster \
        --cache-cluster-id fitness-app-redis || true

    # Wait a bit
    sleep 30

    # Delete other resources
    aws rds delete-db-subnet-group --db-subnet-group-name fitness-app-db-subnet-group || true
    aws elasticache delete-cache-subnet-group --cache-subnet-group-name fitness-app-redis-subnet-group || true

    aws ec2 delete-security-group --group-id $APP_SG_ID || true
    aws ec2 delete-security-group --group-id $DB_SG_ID || true
    aws ec2 delete-security-group --group-id $REDIS_SG_ID || true

    aws ec2 delete-key-pair --key-name $KEY_NAME || true

    log_info "Infrastructure destroyed (VPC cleanup requires manual steps)"
    log_warn "Please manually delete VPC $VPC_ID from AWS Console"
}

show_logs() {
    if [ ! -f ".infrastructure.env" ]; then
        log_error "Infrastructure not set up"
        exit 1
    fi

    source .infrastructure.env
    ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@$PUBLIC_IP \
        "cd /opt/fitness-app && docker-compose logs -f"
}

# Main
case "${1:-}" in
    setup)
        setup_infrastructure
        ;;
    deploy)
        deploy_application
        ;;
    update)
        update_application
        ;;
    destroy)
        destroy_infrastructure
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {setup|deploy|update|logs|destroy}"
        echo ""
        echo "Commands:"
        echo "  setup   - Create AWS infrastructure (VPC, RDS, Redis, EC2)"
        echo "  deploy  - Deploy application to EC2"
        echo "  update  - Update application with new version"
        echo "  logs    - View application logs"
        echo "  destroy - Destroy all resources"
        echo ""
        echo "Example workflow:"
        echo "  1. ./deploy-ec2.sh setup"
        echo "  2. ./deploy-ec2.sh deploy"
        echo "  3. ./deploy-ec2.sh logs"
        exit 1
        ;;
esac
