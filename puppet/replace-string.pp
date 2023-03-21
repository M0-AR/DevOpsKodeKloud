class data_replacer {
  file_line { 'line_replace':
   path  => '/opt/devops/demo.txt',
   match => 'Welcome to Nautilus Industries!',
   line  => 'Welcome to xFusionCorp Industries!',
  }
}

node 'stapp01.stratos.xfusioncorp.com' {
  include data_replacer
}