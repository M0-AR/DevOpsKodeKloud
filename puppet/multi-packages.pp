# Install vim-enhanced and zip packages on the agent node 2 using Puppet
# on node 2 run: 'sudo puppet agent -tv' to apply below class

class multi_package_node {
  package { 'vim-enhanced':
    ensure => installed,
  }
  package { 'zip':
    ensure => installed,
  }
}

node 'stapp02.stratos.xfusioncorp.com' {
  include multi_package_node
}