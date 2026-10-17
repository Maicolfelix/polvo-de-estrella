#!/bin/sh
# Copias web (AAC 160k) de los masters. Los WAV originales no se tocan.
# Uso: sh tools/codificar.sh   (desde la raíz del proyecto)
F=tools/ffmpeg.exe
D="C:/Users/57300/Downloads/ALBUM MAVO POLVO DE ESTRELLA"
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
while [ $# -gt 0 ]; do
  $F -v error -y -i "$D/$2.wav" -c:a aac -b:a 160k -movflags +faststart "audio/$1.m4a"
  shift 2
done
