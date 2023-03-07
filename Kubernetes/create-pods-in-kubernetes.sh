#!/bin/bash
# Create a new pod named pod-httpd with httpd:latest image
kubectl run pod-httpd --image=httpd:latest --labels=app=httpd_app --restart=Never -- /bin/sleep infinity
# kubectl run command to create a new pod named pod-httpd using the httpd:latest image. The app=httpd_app
# label is set using the --labels option, and the container name is set to httpd-container by default.
# The --restart=Never option specifies that the pod should not be restarted automatically, and the 
# -- /bin/sleep infinity argument runs a command to keep the container running indefinitely.

# Verify that the pod is running
kubectl get pods pod-httpd

# chmod +x create-pods-in-kubernetes.sh
# ./create-pods-in-kubernetes.sh




