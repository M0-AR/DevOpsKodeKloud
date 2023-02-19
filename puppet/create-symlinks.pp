# create a symbolic link between two directories and create a blank file on a specific App Server
class symlink {
  file { '/opt/sysops':
    ensure => link,
    target => '/var/www/html',
  }
  file { '/opt/sysops/story.txt':
    ensure => 'present',
    content => '',
  }
}

node 'stapp03.stratos.xfusioncorp.com' {
  include symlink
}