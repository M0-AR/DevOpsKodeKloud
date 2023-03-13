#!/bin/bash

# Create namespace datacenter
kubectl create namespace datacenter

# Create deployment httpd-deploy with 3 replicas and RollingUpdate strategy
kubectl create deployment httpd-deploy --image=httpd:2.4.27 -n datacenter --replicas=3 --strategy=RollingUpdate --max-surge=1 --max-unavailable=2

# Expose deployment on NodePort type service
kubectl expose deployment httpd-deploy -n datacenter --name=httpd-service --type=NodePort --port=80 --node-port=30008

# Update deployment to version httpd:2.4.43 using RollingUpdate
kubectl set image deployment/httpd-deploy httpd=httpd:2.4.43 -n datacenter

# Wait for all pods to be ready
kubectl rollout status deployment/httpd-deploy -n datacenter

# Roll back deployment to previous/original version
kubectl rollout undo deployment/httpd-deploy -n datacenter

# To execute the above script, follow the below steps:
    # Save the script to a file, for example, deploy_update.sh.
    # Make the script executable using the command: chmod +x deploy_update.sh.
    # Run the script using the command: ./deploy_update.sh.
