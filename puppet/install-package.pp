class nginx_installer {
  package { 'nginx':
    ensure => installed,
  }
}

node 'stapp02.stratos.xfusioncorp.com' {
 include nginx_installer
}


# Run 'sudo puppet agent -tv' from server 2