$public_key = ''

# Define class to use existing key and configure passwordless SSH for App Server 1
class ssh_node1 {
  # Copy SSH key to App Server 1
  ssh_authorized_key { 'tony@stapp01':
    ensure => present,
    user   => 'tony',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

# Define class to use existing key and configure passwordless SSH for App Server 2
class ssh_node2 {
  # Copy SSH key to App Server 2
  ssh_authorized_key { 'steve@stapp02':
    ensure => present,
    user   => 'steve',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

# Define class to use existing key and configure passwordless SSH for App Server 3
class ssh_node3 {
  # Copy SSH key to App Server 3
  ssh_authorized_key { 'banner@stapp03':
    ensure => present,
    user   => 'banner',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

# Include the class for each App Server
node 'stapp01.stratos.xfusioncorp.com' {
  include ssh_node1
}
node 'stapp02.stratos.xfusioncorp.com' {
  include ssh_node2
}
node 'stapp03.stratos.xfusioncorp.com' {
  include ssh_node3
}