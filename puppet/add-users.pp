class user_creator {
  user { 'james':
    ensure => 'present',
    uid    => 1937,
  }
}

node 'stapp01.stratos.xfusioncorp.com' {
  include user_creator
}

#puppet agent -tv
#Info: Using configured environment 'production'
#Info: Retrieving pluginfacts
#Info: Retrieving plugin
#Info: Retrieving locales
#Info: Caching catalog for stapp01.stratos.xfusioncorp.com
#Info: Applying configuration version '1682789922'
#Notice: /Stage[main]/User_creator/User[james]/ensure: created
#Notice: Applied catalog in 0.11 seconds
#
#[root@stapp01 ~]# cat /etc/passwd |grep james
#james:x:1937:1937::/home/james:/bin/bash