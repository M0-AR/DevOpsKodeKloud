# There are 6 images listed in the diagram on the right. 

# Using Aquasec Trivy (which is already installed on the controlplane node), identify the image that has the least number of critical vulnerabilities and use it to deploy the alpha-xyz deployment.

# Secure this deployment by enforcing the AppArmor profile called custom-nginx.

# Expose this deployment with a NodePort type service and make sure that only incomings connections from the pod called middleware is accepted and everything else is rejected.

#!/bin/bash

least_critical_image=""
least_critical_count=99999999

namespaces=$(kubectl get namespaces -o json | jq -r '.items[].metadata.name')

for namespace in $namespaces; do
  pods=$(kubectl get pods -n $namespace -o json | jq -r '.items[].metadata.name')
  
  for pod in $pods; do
    containers=$(kubectl get pod $pod -n $namespace -o json | jq -r '.spec.containers[].image')
    
    for container in $containers; do
      result=$(trivy $container | grep "Critical")
      critical_count=$(echo $result | awk '{print $2}')
      
      if [[ $critical_count -lt $least_critical_count ]]; then
        least_critical_count=$critical_count
        least_critical_image=$container
      fi
    done
  done
done

echo "Image with least number of critical vulnerabilities: $least_critical_image ($least_critical_count critical vulnerabilities)"

# Define deployment manifest
deployment_manifest=$(cat << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alpha-xyz
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alpha-xyz
  template:
    metadata:
      labels:
        app: alpha-xyz
    spec:
      containers:
      - name: alpha-xyz
        image: '"$least_critical_image"'
        securityContext:
          appArmorProfile: custom-nginx
        ports:
        - containerPort: 80'
EOF
)

# Define service manifest
service_manifest='apiVersion: v1
kind: Service
metadata:
  name: alpha-xyz-service
spec:
  type: NodePort
  selector:
    app: alpha-xyz
  ports:
  - name: http
    port: 80
    targetPort: 80
  externalTrafficPolicy: Local'

echo "$deployment_manifest" | kubectl apply -f -
echo "$service_manifest" | kubectl apply -f -