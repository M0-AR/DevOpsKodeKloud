node 'stapp01.stratos.xfusioncorp.com' {
  file { '/opt/security/ecommerce.txt':
    ensure  => 'file',
    content => 'Welcome to xFusionCorp Industries!',
    mode    => '0777',
  }
}