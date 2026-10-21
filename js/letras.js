// Versión de presentación de las letras. La fuente (js/datos.js) no se toca: aquí solo se listan
// ediciones mínimas autorizadas — tildes, separación de palabras y puntuación inequívocas — y la lista
// misma es el registro editorial. tools/validar-letras.mjs comprueba que cada línea conserva exactamente
// las mismas letras que el original (sin contar tildes, mayúsculas, signos ni espacios).
// Formato: [texto original, texto de presentación, veces que aparece en la canción].
import { CANCIONES } from './datos.js';

export const EDICIONES = {
  '01': [
    ['la archive en el folder', 'la archivé en el folder', 1],
    ['pienso que sonpa mi', 'pienso que son pa mí', 1],
    ['Por qué te vi ?', '¿Por qué te vi?', 2],
  ],
  '02': [
    ['que aún se a quien se dirige', 'que aún sé a quién se dirige', 1],
  ],
  '03': [
    ['Por qué ahora viniste dando otra caraaaa', '¿Por qué ahora viniste dando otra caraaaa?', 1],
    ['Baby cómo estás ?', 'Baby, ¿cómo estás?', 1],
    ['Porque estás tan bien después dejarme to mal', '¿Por qué estás tan bien después dejarme to mal?', 1],
    ['rabia a mi me da', 'rabia a mí me da', 1],
    ['que era para mi', 'que era para mí', 1],
    ['Ojalá los te amo se vuelvan añejos', 'Ojalá los «te amo» se vuelvan añejos', 1],
    ['Tu siempre serás todo pa mi,', 'Tú siempre serás todo pa mí,', 1],
  ],
  '04': [
    ['A quien engaño aún te extraño', '¿A quién engaño? Aún te extraño', 1],
    ['Fuck que dolor ahora es otro diciembre', 'Fuck, qué dolor, ahora es otro diciembre', 1],
    ['Cuando te besaba sonreías tu mirada', 'Cuando te besaba sonreías, tu mirada', 1],
  ],
  '05': [
    ['corazónes', 'corazones', 1],
    ['Tu y yo y mucho más', 'Tú y yo y mucho más', 1],
    ['Como quieres que te mire y no sienta nada', '¿Cómo quieres que te mire y no sienta nada?', 1],
    ['Mujer tú no te ves pues yo si lo hago', 'Mujer, tú no te ves, pues yo sí lo hago', 1],
    ['Todo lo que quieras mujer tú no', 'Todo lo que quieras, mujer, tú no', 1],
  ],
  '06': [
    ['Mami como supiste en serio donde herirme', 'Mami, ¿cómo supiste en serio dónde herirme?', 1],
  ],
  '07': [
    ['Pero más de mi', 'Pero más de mí', 1],
    ['Sin ti no se quien soy', 'Sin ti no sé quién soy', 1],
    ['Déjame abrir la puerta se que no soy tu invitado', 'Déjame abrir la puerta, sé que no soy tu invitado', 1],
    ['Que te parece si borramos el pasado', '¿Qué te parece si borramos el pasado?', 1],
    ['Que pasaría si algún día cruzamos miradas', '¿Qué pasaría si algún día cruzamos miradas', 1],
    ['Y seguimos estando vaciooos', 'Y seguimos estando vaciooos?', 1],
    ['Qué pasaría ?', '¿Qué pasaría?', 2],
    ['Que pasaría si era mentira', '¿Qué pasaría si era mentira,', 1],
    [' si aún nos vemos todos los día', 'si aún nos vemos todos los día,', 1],
    [' qué pasaría si te abrazaría', 'qué pasaría si te abrazaría,', 1],
    [' me besarías ?', '¿me besarías?', 1],
    ['Que pasa ?', '¿Qué pasa?', 1],
  ],
  '08': [
    ['Donde firmo si esto real aaaa', '¿Dónde firmo si esto real aaaa?', 1],
    ['Dónde firmo si esto es verdad', '¿Dónde firmo si esto es verdad?', 2],
    ['Que aún dudas de mi', 'Que aún dudas de mí', 1],
    ['Aunque este contigo cuidaré', 'Aunque esté contigo cuidaré', 1],
    ['Es que aún que me des la espalda', 'Es que aunque me des la espalda', 1],
  ],
  '09': [
    ['Míra al cielo un ratico hay estrellas', 'Mira al cielo un ratico, hay estrellas', 1],
    ['sepas que por ti ya yo luche', 'sepas que por ti ya yo luché', 1],
    ['A mi me gustaría ser', 'A mí me gustaría ser', 1],
    ['Qué pasaría si pasaria, me besarías o de mí pasarías', '¿Qué pasaría si pasaría?, ¿me besarías o de mí pasarías?', 1],
    ['No se porque lo explico', 'No sé por qué lo explico', 1],
  ],
};

// Dudas reales: se conserva el original y se deja constancia (no se aplican).
export const DUDAS = {
  '01': ['«La razones»: ¿«Las razones»? Cambiaría una letra cantada.', '«la archivé»: ¿«las archivé»? (cartas)', '«Si no estoy lo a tu ladoooo»: «lo» no es claro.', '«al pensar con otro estás» y «Al pensar que con otro estás»: se conservan distintas.'],
  '02': ['«si tu mirada de decepción»: ¿«sí» (afirmación) o «si» (condición)?', '«ser tu mitad que va, ya no quiero…»: ¿«¿qué va?»? La puntuación cambia el sentido.'],
  '03': ['«Donde tú estabas»: ¿pregunta («¿Dónde…?»)?', '«después dejarme»: sin «de»; no se añade.'],
  '04': ['«si yo te las cuenta»: ¿«cuento»?'],
  '07': ['«Porque ahora estás dispuesta…»: ¿«¿Por qué…?» o causal tras «la respuesta»?', '«todos los día»: sin «s»; no se añade.', '«Y hasta el día hoy»: sin «de»; no se añade.'],
  '08': ['«si esto real»: sin «es» en la primera aparición; no se añade.'],
  '09': ['«y otra gritan tu nombre»: ¿«otras»?'],
};

// Líneas de presentación, 1:1 con las del original (las vacías marcan estrofas).
export function lineasPresentacion(n) {
  let texto = CANCIONES.find(c => c.n === n).letra;
  for (const [de, a] of EDICIONES[n] || []) texto = texto.split(de).join(a);
  return texto.split('\n');
}
