#!/bin/bash

# ========================================================================
# Title: restart_services.sh
# Author: CEO-Vision
# Date: 01.08.2024
# Version  1.0
# GoFAST Version: 4.3.0_r2
# Description: Check if services need restart (old update_check script)
# ========================================================================

# Control files dropped by the platform, outside the web root
CONTROL_DIR=/var/www/gofast-control

if [ -f $CONTROL_DIR/restart_bonita.txt ]
then
        echo -e "\n\t\tRestarting Bonita...\n" >> /var/log/messages
        service tomcat@bonita restart
        rm -f /var/www/d7/sites/default/files/swf/cookie_bonita*
        rm -f $CONTROL_DIR/restart_bonita.txt
fi

if [ -f $CONTROL_DIR/restart_solr.txt ]
then
        echo -e "\n\t\tRestarting Solr...\n" >> /var/log/messages
        systemctl restart solr
        rm -f $CONTROL_DIR/restart_solr.txt
fi

if [ -f $CONTROL_DIR/restart_soffice.txt ]
then
        echo -e "\n\t\tRestarting soffice...\n" >> /var/log/messages
        systemctl restart soffice
        rm -f $CONTROL_DIR/restart_soffice.txt
fi

# Stop services if needed
if [ -f $CONTROL_DIR/stop_alfresco.txt ]
then
        echo -e "\n\t\tStopping Alfresco...\n" >> /var/log/messages
        service tomcat@alfresco stop
        rm -f $CONTROL_DIR/stop_alfresco.txt
fi

if [ -f $CONTROL_DIR/stop_bonita.txt ]
then
        echo -e "\n\t\tStopping Bonita...\n" >> /var/log/messages
        service tomcat@bonita stop
        rm -f /var/www/d7/sites/default/files/swf/cookie_bonita*
        rm -f $CONTROL_DIR/stop_bonita.txt
fi

if [ -f $CONTROL_DIR/stop_solr.txt ]
then
        echo -e "\n\t\tStopping Solr...\n" >> /var/log/messages
        service solr stop
        rm -f $CONTROL_DIR/stop_solr.txt
fi

if [ -f $CONTROL_DIR/stop_soffice.txt ]
then
        echo -e "\n\t\tStopping soffice...\n" >> /var/log/messages
        systemctl stop soffice
        rm -f $CONTROL_DIR/stop_soffice.txt
fi

# Check Soffice status ( cannot be done with PHP for the moment )
if ps ax | grep -v grep | grep "/opt/libreoffice" > /dev/null
then
        SOFFICE_STATE=OK
else
        SOFFICE_STATE=KO
fi
# Written as apache: root must not write through a link apache could put in its own folder
rm -f $CONTROL_DIR/soffice_status.txt
echo "soffice:$SOFFICE_STATE" | runuser -u apache -- tee $CONTROL_DIR/soffice_status.txt > /dev/null
