class ntpconfig {
  package { 'ntp':
    ensure => installed,
  }

  file { '/etc/ntp.conf':
    ensure  => file,
    content => "server 1.africa.pool.ntp.org iburst\n",
    require => Package['ntp'],
  }
}

node 'stapp02.stratos.xfusioncorp.com' {
  include ntpconfig
}