---
layout: default
---

# ./


## AGENT SUDO 

### (Uso de Burpsuite, esteganografía y johntheripper)

Iniciamos la máquina en tryhackme después de haber iniciado la vpn correspondiente.

![image](../zimages/Pasted_image_20241001211450.png)



Hacemos un ping para saber: 1º, si la máquina atacante es Windows y 2º, para saber si tenemos conexión con la víctima.

![image](../zimages/Pasted_image_20241001211425.png)

`aquí la función con la que he hecho el ping`

```bash
# Mostrar el TARGET
function target(){
        lectura=$(cat ~/.config/polybar/shapes/scripts/target | awk '{print $1}')
        ping -c1 $lectura 2>/dev/null

if [ $? -ne 0 ]; then
                echo -e "\e[1;34m Primero tienes que añadir una ip VÁLIDA con el comando 'set>
                return 1
fi
}
```


Hacemos un escaneo con nmap para ver puertos abiertos.

![image](../zimages/Pasted_image_20241001212148.png)

`Dejo aquí la función para automatizar los escaneos`

```bash
# Función de NMAP
function escaneo() {

archivo_target=~/.config/polybar/shapes/scripts/target
archivo_resultado="escaneo_nmap"  # Archivo de salida del escaneo
cancelado=0 # Variable para controlar si se ha cancelado el escaneo

# Configuramos el trap para capturar la señal de interrupción (Ctrl+C) y eliminar el arch>
trap "echo -e '\e[1;31m Escaneo cancelado. Eliminando archivo de resultados... \e[0m'; rm>

# Verificamos si el archivo tiene contenido
if [ $(wc -w < "$archivo_target") -gt 0 ]; then

# Ahora leeremos el archivo para encontrar una IP válida.
busqueda_ip=$(grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' "$archivo_target" | head -n 1)

# Comprobamos si se encontró una IP válida
if [ -z "$busqueda_ip" ]; then
echo -e "\e[1;31m No se encontró ninguna IP válida en el archivo. Asegúrate de ag>
return 1  # Salir si no se encontró IP
fi

# Realizamos el escaneo con la IP encontrada
nmap -p- --open -sCV -sS -n -Pn -vvv $busqueda_ip -oN $archivo_resultado 2>/dev/null

# Comprobamos si se ha cancelado el escaneo
if [ $cancelado -eq 1 ]; then
return 1  # Salir si se ha cancelado el escaneo
fi

# Comprobamos si hubo un error en el escaneo
if [ $? -ne 0 ]; then
echo -e "\e[1;31m Hubo un problema al realizar el escaneo, prueba a poner una IP >
rm -f $archivo_resultado  # Eliminar el archivo de resultado del escaneo si falló
return 1  # Salir si el escaneo falló
fi

# Comprobamos si el escaneo encontró algún puerto abierto (o IP activa)
if ! grep -q "open" $archivo_resultado; then
echo -e "\e[1;33m El escaneo no encontró ninguna IP activa o puertos abiertos en >
rm -f $archivo_resultado  # Eliminar el archivo si no hay resultados útiles

return 1  # Salir si no se encontraron puertos abiertos
fi

echo -e "\e[1;32m Escaneo completado exitosamente. \e[0m"

else
# Si el archivo está vacío o no tiene palabras, mostramos un mensaje de error
echo -e "\e[1;34m No has añadido ningún objetivo!! Dime cuál es la IP a la que debo h>
return 1  # Salir si no se encontró contenido en el archivo
fi
}
```


Como vemos están abiertos varios puertos

![image](../zimages/Pasted_image_20241001212221.png)


En este caso vamos a empezar por entrar en el puerto 80 que es una página web

![image](../zimages/Pasted_image_20241001212245.png)


Aquí vemos una posible pista: user-agent. 

![image](../zimages/Pasted_image_20241001212313.png)


Abrimos Burpsuite y cambiamos el Proxy 

![image](../zimages/Pasted_image_20241001212351.png)

Una vez en burpsuite, Activamos la intercepción.

![image](../zimages/Pasted_image_20241001212504.png)

En la web, recargamos la página para que nos detecte el burpsuite.

![image](../zimages/Pasted_image_20241001212538.png)


Y aquí vemos la solicitud de la web.

![image](../zimages/Pasted_image_20241001212602.png)

Localizamos lo que antes nos dió como pista la web

![image](../zimages/Pasted_image_20241001212625.png)

Y vamos probando, ya que el mensaje estaba hecho por un tal "Agent R", yo fui probando con letras. (A,B,C,D,E, etc.). En este caso probamos con la letra "C".

![image](../zimages/Pasted_image_20241001212641.png)

Le damos a "forward" para enviar la solicitud modificada.

![image](../zimages/Pasted_image_20241001212715.png)

Y en la web nos aparece otro mensaje distinto.

![image](../zimages/Pasted_image_20241001212809.png)


Si nos fijamos un poco en el mensaje, nos da otra pista. Nos está dando un usuario (chris) y una posible forma de como conseguir la contraseña.

![image](../zimages/Pasted_image_20241001212847.png)


Como nos dice que la contraseña es muy débil, vamos a probar con un ataque de fuerza bruta, utilizaremos hydra con estos parámetros:

```bash
hydra 10.10.201.163 ftp -l chris -P /usr/share/wordlists/rockyou.txt -T 30 -I -o hydra.txt
```
Abrimos el archivo que nos saca hydra, y vemos la contraseña.

![image](../zimages/Pasted_image_20241001213947.png)

Vamos a intentar entrar en ftp con el usuario y la contraseña que tenemos 

![image](../zimages/Pasted_image_20241001214229.png)

Una vez dentro, miramos los archivos que hay.

![image](../zimages/Pasted_image_20241001214403.png)

Los descargamos todos en nuestra máquina atacante.

![image](../zimages/Pasted_image_20241001214426.png)


Y aquí los tenemos.

![image](../zimages/Pasted_image_20241001214509.png)

Leemos el archivo de texto y nos dice que todas las fotos son "falsas", lo que nos dice que tenemos que hacer un poco de estenografía para sacar los archivos ocultos en las fotos.

![image](../zimages/Pasted_image_20241001214538.png)

Usaremos binwalk en las fotos, para ver si hay algún archivo oculto, en "cutie.png" tenemos un archivo .zip encriptado.

![image](../zimages/Pasted_image_20241001214628.png)

Vamos a utilizar foremost para extraer ese archivo.

![image](../zimages/Pasted_image_20241001214811.png)

Una vez extraído, usaremos la herramienta de "johntheripper", en este caso usaremos primero una de sus versiones, "zip2john", que se usa para extraer los hashes de los archivos.

![image](../zimages/Pasted_image_20241001214933.png)

Ahora que tenemos el hash, usamos otra vez johntheripper para ejecutar un ataque de fuerza bruta sobre ese hash, con el objetivo de conseguir una contraseña, como yo ya lo había hecho, utilizo el parámetro `--show` para que me muestre la contraseña, que en este caso era "alien".

![image](../zimages/Pasted_image_20241001215129.png)


Ahora que tenemos la contraseña, vamos a extraer el archivo .zip para ver que contiene.

![image](../zimages/Pasted_image_20241001215236.png)


Nos extrae una archivo de texto que contiene un mensaje extraño, el cual parece estar codificado en base64.

![image](../zimages/Pasted_image_20241001215253.png)

Lo decodificamos y nos aparece una contraseña, recordemos que nos queda una imagen de las primeras que encontramos en ftp que no la hemos mirado.

![image](../zimages/Pasted_image_20241001215318.png)

En la otra imagen utilizaremos steghide para extraer lo que hay dentro, nos pedirá una frase como contraseña, la cual acabamos de decodificar.

![image](../zimages/Pasted_image_20241001215420.png)

Nos extrae un mensaje que muestra una contraseña y un usuario

![image](../zimages/Pasted_image_20241001215444.png)

Si volvemos a ver el escaneo que hicimos con nmap al principio, vemos que también estaba abierto el puerto de ssh

![image](../zimages/Pasted_image_20241001215519.png)


Intentamos entrar en la máquina víctima con la contraseña y el usuario que tenemos.

![image](../zimages/Pasted_image_20241001215614.png)


![image](../zimages/Pasted_image_20241001215631.png)


Vemos que  somos el usuario "james"

![image](../zimages/Pasted_image_20241001220117.png)

Conseguimos la "user_flag"

![image](../zimages/Pasted_image_20241001220736.png)


A continuación, necesitamos escalar privilegios para ser root, para esto vamos a utilizar "linux exploit suggester", que es un programa muy útil que nos da recomendaciones de por donde seguir en base a las vulnerabilidades que encuentra en el sistema.

![image](../zimages/Pasted_image_20241001223559.png)

Lo descargamos de github

![image](../zimages/Pasted_image_20241001223823.png)


y creamos un servidor http por el puerto 8008 para descargarlo en la máquina víctima.

![image](../zimages/Pasted_image_20241001223840.png)

Volvemos a la máquina víctima y lo descargamos

![image](../zimages/Pasted_image_20241001223913.png)

Le damos al script los privilegios necesarios para ejecutarlo

![image](../zimages/Pasted_image_20241001223932.png)

y lo ejecutamos

![image](../zimages/Pasted_image_20241001223958.png)


Investigando vemos que nos aparece esta vulnerabilidad, tenemos un código CVE el cual buscaremos por internet para encontrar una forma de explotarlo


![image](../zimages/Pasted_image_20241001224035.png)


Una vez encontrado el repositorio de github, lo descargamos primero en nuestra máquina atacante.

![image](../zimages/Pasted_image_20241001224231.png)


Volvemos a hacer el mismo proceso de iniciar el servidor http

![image](../zimages/Pasted_image_20241001223840.png)


y lo descargamos, igual que antes, en la máquina víctima

![image](../zimages/Pasted_image_20241001224458.png)

Le volvemos a dar permisos

![image](../zimages/Pasted_image_20241001224522.png)

Y lo ejecutamos

![image](../zimages/Pasted_image_20241001224539.png)

Ya somos root  :)

![image](../zimages/Pasted_image_20241001224555.png)



