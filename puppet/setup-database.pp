class mysql_database {

  # Install the mariadb-server package and start its service
  package { 'mariadb-server':
    ensure => installed,
  }

  service { 'mariadb':
    ensure => running,
    enable => true,
    require => Package['mariadb-server'],
  }

  # Create the database and user with the specified credentials
  mysql::db { 'kodekloud_db3':
    user     => 'kodekloud_cap',
    password => 'dCV3szSGNA',
    host     => 'localhost',
    grant    => ['SELECT', 'UPDATE'],
    require  => Service['mariadb'],
  }
}

node 'stdb01.stratos.xfusioncorp.com' {
    include mysql_database
}