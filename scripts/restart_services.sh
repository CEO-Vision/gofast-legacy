#!/bin/bash

# ========================================================================
# Title: restart_services.sh
# Author: CEO-Vision
# Date: 01.08.2024
# Version  1.0
# GoFAST Version: 4.3.0_r2
# Description: Check if services need restart (old update_check script)
# ========================================================================

if [ -f /var/www/d7/sites/default/files/restart_bonita.txt ]
then
        echo -e "\n\t\tRestarting Bonita...\n" >> /var/log/messages
        service tomcat@bonita restart
        rm -f /var/www/d7/sites/default/files/swf/cookie_bonita*
        rm -f /var/www/d7/sites/default/files/restart_bonita.txt
fi

if [ -f /var/www/d7/sites/default/files/restart_solr.txt ]
then
        echo -e "\n\t\tRestarting Solr...\n" >> /var/log/messages
        systemctl restart solr
        rm -f /var/www/d7/sites/default/files/restart_solr.txt
fi

if [ -f /var/www/d7/sites/default/files/restart_soffice.txt ]
then
        echo -e "\n\t\tRestarting soffice...\n" >> /var/log/messages
        systemctl restart soffice
        rm -f /var/www/d7/sites/default/files/restart_soffice.txt
fi

# Stop services if needed
if [ -f /var/www/d7/sites/default/files/stop_alfresco.txt ]
then
        echo -e "\n\t\tStopping Alfresco...\n" >> /var/log/messages
        service tomcat@alfresco stop
        rm -f /var/www/d7/sites/default/files/stop_alfresco.txt
fi

if [ -f /var/www/d7/sites/default/files/stop_bonita.txt ]
then
        echo -e "\n\t\tStopping Bonita...\n" >> /var/log/messages
        service tomcat@bonita stop
        rm -f /var/www/d7/sites/default/files/swf/cookie_bonita*
        rm -f /var/www/d7/sites/default/files/stop_bonita.txt
fi

if [ -f /var/www/d7/sites/default/files/stop_solr.txt ]
then
        echo -e "\n\t\tStopping Solr...\n" >> /var/log/messages
        service solr stop
        rm -f /var/www/d7/sites/default/files/stop_solr.txt
fi

if [ -f /var/www/d7/sites/default/files/stop_soffice.txt ]
then
        echo -e "\n\t\tStopping soffice...\n" >> /var/log/messages
        systemctl stop soffice
        rm -f /var/www/d7/sites/default/files/stop_soffice.txt
fi

# Edit my.cnf if needed
if [ -f /var/www/d7/sites/default/files/my.cnf ]
then
        source ~/.bashrc
        \cp -Rf /var/www/d7/sites/default/files/my.cnf /etc/my.cnf
        rm -f /var/www/d7/sites/default/files/my.cnf
        systemctl restart mysqld
fi

# Check Soffice status ( cannot be done with PHP for the moment )
if ps ax | grep -v grep | grep "/opt/libreoffice" > /dev/null
then
	rm -f /var/www/d7/sites/default/files/soffice_status.txt
        echo "soffice:OK" > /var/www/d7/sites/default/files/soffice_status.txt
else
	rm -f /var/www/d7/sites/default/files/soffice_status.txt
        echo "soffice:KO" > /var/www/d7/sites/default/files/soffice_status.txt
fi
