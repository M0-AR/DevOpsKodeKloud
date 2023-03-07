$public_keygent = 'AAAAB3NzaC1yc2EAAAADAQABAAABAQDTNGdUNynvKnE6zUPkfvWgPoJqrUsNEBFeht0YoFCKqQf6j/jMn2zAegG0OK38hS+SDZVa4SxcuKFXQgoup5UYyNXiy7mAiiX6tyEBFcjLVb1pno563DE+Z4T1b0XtDq4i0WHcFYoUN2s8J5sLY3Mrxkwi7uWCc9GM/NK/E6C2oySqTC93N38K3Olg5/ExBcU9bHv7B1rNc4AYQErPiBhw60/wygw9Yf7to3k8wqfJF+8DUA6qj2i69S/ga+LTitX6VgO+4MXFtuPen0DsGHJUpfygfw5JHp+K1KSu3NgRIcbCKPI6zgpPxBD/qiw4yrmL41MyIrB1gGtkNS2VCB//'

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