# DevOps Scripts and Configurations

This repository is a collection of scripts and configuration files for various DevOps tools and technologies, including Kubernetes, Ansible, and Puppet. It also contains challenges and mock exam questions for CKA and CKS certifications.

## Repository Structure

```
.
├── CKS-Challenges
├── Certified-Kubernetes-Administrator-(CKA)-Mock-Exam
├── Kubernetes
├── ansible
├── deploy-guest-book-app-on-kubernetes
└── puppet
```

---

## CKS-Challenges

This directory contains challenges related to the Certified Kubernetes Security Specialist (CKS) certification.

*   `scan_images_and_deploy.sh`: A shell script that scans for the least vulnerable container image in a Kubernetes cluster using Trivy, deploys it with a specific AppArmor profile, and exposes it via a NodePort service.

---

## Certified-Kubernetes-Administrator-(CKA)-Mock-Exam

This directory contains a set of mock exam questions and their solutions for the Certified Kubernetes Administrator (CKA) certification.

*   `01-pod-called-looper-cka16-arch-using-busybox.yml`: A YAML manifest to create a simple pod that runs a continuous loop.
*   `02-pod-consumes-most-memory-across-all-clusters.txt`: A command to find the pod consuming the most memory across all namespaces.
*   `03-inspect-save-logs-of-pod-with-string-ERROR.txt`: Instructions on how to filter and save pod logs containing a specific error string.
*   `04-update-environment-variable-in-pod.txt`: Steps to update an environment variable in a running pod.
*   `05-filter-display-targetPort-for-service-cka25-arch-using-jsonpath.txt`: How to use `jsonpath` to extract specific information from a Kubernetes service.
*   `06-check-cronjob-running-per-required-schedule.txt`: Instructions on how to check, fix, and validate a CronJob.
*   `07-fix-issue-with-template.txt`: A guide to troubleshooting and fixing an invalid `livenessProbe` in a pod manifest.

---

## Kubernetes

This directory contains a wide variety of YAML files and scripts demonstrating various Kubernetes resources and concepts.

*   `countdown.yaml`: A Kubernetes Job that runs a simple countdown script.
*   `create-namespaces-in-kubernetes-cluster.yaml`: Creates a namespace and a pod within it.
*   `create-pods-in-kubernetes.sh`: A shell script to create a pod using `kubectl run`.
*   `create-replicaset-in-kubernetes-cluster.yaml`: A manifest for a ReplicaSet.
*   `deploy nginx-web-server-on-kubernetes-cluster.yaml`: Deploys NGINX using a Deployment and exposes it with a NodePort Service.
*   `deploy-apache-web-server-on-kubernetes-cLuster.yaml`: Deploys Apache using a Deployment and exposes it with a NodePort Service.
*   `deploy-grafana-on-kubernetes-cluster.yaml`: Deploys Grafana and exposes it with a NodePort Service.
*   `deploy-jenkins-on-kubernetes.yaml`: Deploys Jenkins and exposes it with a NodePort Service.
*   `deploy-mysql-on-kubernetes.yaml`: A complete example of deploying MySQL with Persistent Volumes, Persistent Volume Claims, Secrets, and a Service.
*   `deploy-nagios-on-kubernetes.yaml`: Deploys Nagios and exposes it with a NodePort Service.
*   `deploy-nginx-and-phpfpm-on-kubernetes.yaml`: A multi-container pod setup for NGINX and PHP-FPM using a shared volume and a ConfigMap.
*   `deploy-node-app-on-kubernetes.yaml`: Deploys a Node.js application.
*   `deploy-tomcat-app.yml`: A Deployment for a Tomcat application.
*   `init-containers.yml`: Demonstrates the use of Init Containers.
*   `kubernetes-cronjob.yml`: An example of a CronJob.
*   `kubernetes-environment-variables.yml`: Shows how to expose pod information as environment variables.
*   `kubernetes-persistent-volumes.yml`: An example of using Persistent Volumes and Claims.
*   `kubernetes-redis-deployment.yml`: Deploys Redis using a Deployment and a ConfigMap.
*   `kubernetes-shared-volumes.yml`: Demonstrates sharing a volume between two containers in a pod.
*   `kubernetes-time-check-pod.yaml`: A pod that uses a ConfigMap to configure an environment variable.
*   `print-environment-variables.yaml`: A simple pod to demonstrate defining and using environment variables.
*   `replication-controller-in-kubernetes.yaml`: An example of a ReplicationController (an older Kubernetes resource).
*   `rolling-update.txt`: Instructions on how to perform a rolling update on a deployment.
*   `rolling-updates-and-rolling-back-deployments.sh`: A script that automates creating, updating, and rolling back a deployment.
*   `sidecar-containers.yaml`: Demonstrates the sidecar container pattern with NGINX and a log-shipping container.
*   `tomcat-deployment-xfusion.txt`: A step-by-step guide to deploying a Tomcat application.
*   `troubleshooting-fix-YAML-indentation.yml`: A corrected YAML file for a full MySQL deployment, likely used for a troubleshooting exercise.

---

## ansible

This directory contains Ansible playbooks for various automation tasks.

*   `ansible-blockinfile-module.yaml`: Sets up an Apache server and uses the `blockinfile` module to manage the content of `index.html`.
*   `ansible-lineinfile-module.yaml`: Sets up an Apache server and uses the `lineinfile` module to add a line to `index.html`.
*   `ansible-setup-httpd-and-php.yaml`: Installs and configures Apache with PHP, using the `replace` and `template` modules.
*   `ansible-unarchive-module.yml`: Uses the `unarchive` module to extract a zip file.
*   `archive-module.yml`: Uses the `archive` module to create a `tar.gz` file and sets ownership conditionally based on the host.
*   `basic-playbook.yml`: A pair of playbooks to create and then validate the existence of a file.
*   `copy-module.yml`: A simple playbook to copy a file to managed nodes.
*   `create-blank-file-on-servers.yaml`: Creates a file and sets its ownership.
*   `create-users-and-groups.yaml`: Manages users and groups, including setting hashed passwords and custom home directories.
*   `creating-soft-links.yaml`: Creates files and symbolic links on different hosts based on hostname.
*   `facts-gathering.yml`: Demonstrates using Ansible facts to create a dynamic `index.html` page with the node's IP address.
*   `file-module.yml`: A simple playbook to create a file with specific ownership and permissions.
*   `managing-ACL.yaml`: Manages file ACLs (Access Control Lists) on different hosts.
*   `replace-module.yml`: Uses the `replace` module to find and replace strings in files.
*   `using-ansible-conditionals.yaml`: Uses `when` conditions to copy different files to different servers.

---

## deploy-guest-book-app-on-kubernetes

This directory contains the manifests to deploy the classic Kubernetes Guestbook application.

*   `redis-master-deplo.yml`: Deployment for the Redis master.
*   `redis-master-service.yml`: ClusterIP Service for the Redis master.
*   `redis-slave-deplo.yml`: Deployment for the Redis slaves.
*   `redis-slave-service.yml`: ClusterIP Service for the Redis slaves.
*   `front-end-deploy-redis-php.yml`: Deployment for the PHP frontend.
*   `front-end-service-redis-php.yml`: NodePort Service to expose the frontend.

---

## puppet

This directory contains Puppet manifests for configuration management.

*   `add-users.pp`: Creates a user on a specific node.
*   `create-symlinks.pp`: Creates a symbolic link and a file.
*   `install-package.pp`: Installs the NGINX package.
*   `manage-services.pp`: Installs the Tomcat package and manages the service.
*   `multi-packages.pp`: Installs multiple packages (`vim-enhanced`, `zip`).
*   `replace-string.pp`: Uses the `file_line` resource from the `stdlib` module to replace a line in a file.
*   `setup-NTP-server.pp`: Configures an NTP client.
*   `setup-database.pp`: Sets up a MariaDB server and creates a database and user using the `mysql` module.
*   `setup-file-permissions.pp`: Creates a file with specific content and permissions.
*   `setup-ssh-keys-01.pp` & `setup-ssh-keys.pp`: Manages SSH authorized keys using the `ssh_authorized_key` module. (These two files are identical).
