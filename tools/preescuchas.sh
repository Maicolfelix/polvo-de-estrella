#!/bin/sh
# Fragmentos de 30 s (con fundidos) desde los WAV, en los inicios PROVISIONALES de tools/fragmentos.json.
F=tools/ffmpeg.exe
D="C:/Users/57300/Downloads/ALBUM MAVO POLVO DE ESTRELLA"
set -- \
 01 24 SI_NO_ESTOY_A_TU_LADO_MAVO_MASTER_ESTUDIO_V2 \
 02 55 TU_SILUETA_NO_ME_DANA_MAVO_MASTER_ESTUDIO_V2 \
 03 73 POR_QUE_ESTAS_TAN_BIEN_MASTER_ESTUDIO_V2 \
 04 82 SE_ACABA_EL_VERANO_MAVO_MASTER_ESTUDIO_V2 \
 05 114 TODOLOLO_MAVO_MASTER_ESTUDIO_V2 \
 06 40 DEBERIA_SER_UN_SUENO_MAS_MASTER_ESTUDIO_V2 \
 07 68 QUE_PASARIA_MAVO_MASTER_ESTUDIO_V2 \
 08 101 ESTO_ES_REAL_DESDE_EL_DIA_UNO_MAVO_MASTER_ESTUDIO_V2 \
 09 50 THE_LAST_OF_MAVO_MASTER_ESTUDIO_V2
while [ $# -gt 0 ]; do
  # 07: con aac 128k el fragmento decodificaba a +0,73 dBFS; aac_mf 256k lo deja por debajo de 0
  if [ $1 = 07 ]; then C="-c:a aac_mf -b:a 256k"; else C="-c:a aac -b:a 128k"; fi
  $F -v error -y -ss $2 -t 30 -i "$D/$3.wav" -af "afade=t=in:d=1.2,afade=t=out:st=27:d=3" $C -movflags +faststart "audio/$1-pre.m4a"
  shift 3
done
