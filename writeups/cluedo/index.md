---
layout: default
---
![image](../../Imágenes%20Máquinas/CLUEDO.png)


# CLUEDO [By SamuCrow] / Easy
### (Decoding [CyberChef], Fuzzing web, escalada mediante AWK)

#### - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

###### si quieres descargar la máquina aquí la tienes: https://mega.nz/file/Ai4zXZ5B#sE98B_YIa7rp3KEs0yM-DBzgNizAhu1yk41CB8FordY


En primer lugar, vamos a buscar las ips que hay en nuestra red, para eso utilizaremos arp-scan

![image](../zimages/Pasted_image_20241005160925.png)

vemos que la MAC empieza por 08:00:, eso quiere decir que es una máquina virtual

![image](../zimages/Pasted_image_20241005160938.png)

Tiramos un escaneo de nmap para ver puertos abiertos y nos salen estos:

![image](../zimages/Pasted_image_20241005161743.png)

Si hacemos fuzzing de directorios nos aparece 1 que nos llama la atención, previamente si visitamos la web principal nos da un par de pistas también 

![image](../zimages/Pasted_image_20241005161718.png)

nos metemos en el buscador

![image](../zimages/Pasted_image_20241005161833.png)

y vemos que hay unas palabras raras, podría ser que está encodeado

![image](../zimages/Pasted_image_20241005162120.png)

Vamos a Cyberchef, nuestra página de confianza para estas cosas

![image](../zimages/Pasted_image_20241005162107.png)

Y ponemos que nos lo decodifique en ROT13, ya que había una pista en la web principal

![image](../zimages/Pasted_image_20241005162142.png)

Vemos también que hay un nombre de usuario que, por las pintas, parece que es un directorio, pero podemos intuir que también está encodeado

![image](../zimages/Pasted_image_20241005162151.png)

Si volvemos a Cyberchef y probamos otra vez con ROT13 nos saca un .txt

![image](../zimages/Pasted_image_20241005162209.png)

Vamos a probar a ponerlo como subdirectorio

![image](../zimages/Pasted_image_20241005162229.png)

Y nos saca un mensaje en base64

![image](../zimages/Pasted_image_20241005162239.png)

Nos vamos a la terminal y lo desciframos

![image](../zimages/Pasted_image_20241005162341.png)

Nos da una contraseña que nos servirá para entrar mediante mysql

![image](../zimages/Pasted_image_20241005165126.png)

Nos pide un certificado firmado

![image](../zimages/Pasted_image_20241005165225.png)

pero hacemos un bypass de eso con este comando

![image](../zimages/Pasted_image_20241005165252.png)

ahora nos metemos en la base de datos y vemos lo que hay

![image](../zimages/Pasted_image_20241005165335.png)

nos metemos en tudor_manor

![image](../zimages/Pasted_image_20241005165430.png)

y vamos a dr.black, que es el usuario que hemos visto. Nos da otro subdirectorio

![image](../zimages/Pasted_image_20241005165520.png)

lo buscamos y parece que es un diccionario

![image](../zimages/Pasted_image_20241005165547.png)

lo descargamos mediante `wget`

![image](../zimages/Pasted_image_20241005165655.png)

y nos volvemos al directorio de chat.html para buscar más posibles usuarios

![image](../zimages/Pasted_image_20241005165730.png)

Vemos que nos da otro usuario

![image](../zimages/Pasted_image_20241005165740.png)

Vamos a probar a hacer fuerza bruta por ssh

![image](../zimages/Pasted_image_20241005165904.png)

y nos encuentra una contraseña 

![image](../zimages/Pasted_image_20241005170017.png)

entramos en la máquina victima

![image](../zimages/Pasted_image_20241005170112.png)

y si leemos el user.txt vemos el siguiente mensaje

![image](../zimages/Pasted_image_20241005170304.png)

Vamos a seguir los pasos buscando en los directorios de la máquina, pero no tenemos permisos

![image](../zimages/Pasted_image_20241005170355.png)

si hacemos un `sudo - l` vemos que tenemos una forma de escalar privilegios

![image](../zimages/Pasted_image_20241005170408.png)

nos metemos en https://gtfobins.github.io para ver que nos propone para awk

![image](../zimages/Pasted_image_20241005170438.png)

y metemos el comando

![image](../zimages/Pasted_image_20241005170539.png)

ya somos root, ahora vamos a buscar la flag en los directorios

![image](../zimages/Pasted_image_20241005170751.png)

nos vamos a /usr

![image](../zimages/Pasted_image_20241005170828.png)

y leemos la pista

![image](../zimages/Pasted_image_20241005170922.png)

nos vamos al último directorio que nos manda y ya tenemos la flag de root

![image](../zimages/Pasted_image_20241005171009.png)


# ./ROOTED
