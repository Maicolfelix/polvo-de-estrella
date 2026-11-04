#!/bin/sh
# Copias web (AAC 160k) de los masters. Los WAV originales no se tocan.
# Uso: sh tools/codificar.sh   (desde la raíz del proyecto)
F=tools/ffmpeg.exe
# carpeta de los masters y sufijo de sus nombres (2026-11-04: versiones «mono-safe»):
#   D="…/album mono-safe" S=" mono-safe" sh tools/codificar.sh
D=${D:-"C:/Users/57300/Downloads/ALBUM MAVO POLVO DE ESTRELLA"}; S=${S:-}
set -- \
 01 SI_NO_ESTOY_A_TU_LADO_MAVO_MASTER_ESTUDIO_V2 \
 02 TU_SILUETA_NO_ME_DANA_MAVO_MASTER_ESTUDIO_V2 \
 03 POR_QUE_ESTAS_TAN_BIEN_MASTER_ESTUDIO_V2 \
 04 SE_ACABA_EL_VERANO_MAVO_MASTER_ESTUDIO_V2 \
 05 TODOLOLO_MAVO_MASTER_ESTUDIO_V2 \
 06 DEBERIA_SER_UN_SUENO_MAS_MASTER_ESTUDIO_V2 \
 07 QUE_PASARIA_MAVO_MASTER_ESTUDIO_V2 \
 08 ESTO_ES_REAL_DESDE_EL_DIA_UNO_MAVO_MASTER_ESTUDIO_V2 \
 09 THE_LAST_OF_MAVO_MASTER_ESTUDIO_V2
mkdir -p audio
# Excepciones (2026-10-17; la 04 desde los masters «mono-safe» del 2026-11-04): con aac a 160k, las copias 02, 03, 04, 05 y 07 decodificaban
# por encima de 0 dBFS (+0,46 a +1,47) aunque sus WAV no pasan de −1,1 dBFS: sobreimpulso del códec en
# transitorios (en la 02, el arranque). Se codifican con aac_mf (Media Foundation, Windows) a 256k: pico
# decodificado ≈ −1,0 dBFS, sin cambiar nivel, duración ni alineación. Verificar con tools/nivel.py.
while [ $# -gt 0 ]; do
  case $1 in
    02|03|04|05|07) $F -v error -y -i "$D/$2$S.wav" -c:a aac_mf -b:a 256k -movflags +faststart "audio/$1.m4a" ;;
    *)           $F -v error -y -i "$D/$2$S.wav" -c:a aac -b:a 160k -movflags +faststart "audio/$1.m4a" ;;
  esac
  shift 2
done
