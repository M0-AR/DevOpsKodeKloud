$public_key = ''

class ssh_node1 {
  # Configure passwordless SSH connection to App Server 1 (Agent Node 1)
  ssh_authorized_key { 'tony@stapp01':
    ensure => present,
    user   => 'tony',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

class ssh_node2 {
  # Configure passwordless SSH connection to App Server 2 (Agent Node 2)
  ssh_authorized_key { 'steve@stapp02':
    ensure => present,
    user   => 'steve',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

class ssh_node3 {
  # Configure passwordless SSH connection to App Server 3 (Agent Node 3)
  ssh_authorized_key { 'banner@stapp03':
    ensure => present,
    user   => 'banner',
    type   => 'ssh-rsa',
    key    => $public_key, 
  }
}

node stapp01.stratos.xfusioncorp.com {
    include ssh_node1
}

node stapp02.stratos.xfusioncorp.com {
    include ssh_node2
}

node stapp03.stratos.xfusioncorp.com {
    include ssh_node3
}