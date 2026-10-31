// El material de una ficha es texto («Multipresa, regleta de 20 mm», «Ninguno; presas fáciles…»). «Ninguno» se enseña
// como «Sin material», que se entiende sin contexto en una lista o un chip.
const NINGUNO = /^ningun[oa]?\b/i
const SIN_MATERIAL = 'Sin material'

const mayuscula = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

// Las piezas del material, para los chips de la ficha.
export function piezasMaterial(material: string): string[] {
  return material.split(/[,;]\s*/).map((m) => m.trim()).filter(Boolean).map((m) => (NINGUNO.test(m) ? SIN_MATERIAL : m))
}

// Una línea para la lista: la primera pieza («Multipresa»). Si no hace falta material, lo que va tras el «;» («Presas
// fáciles o vías…») o, si no hay nada más, «Sin material».
export function resumenMaterial(material: string): string {
  const texto = material.trim()
  if (NINGUNO.test(texto)) {
    const resto = texto.split(';').slice(1).join(';').trim()
    return resto ? mayuscula(resto) : SIN_MATERIAL
  }
  return texto.split(/[,;]/)[0]!.trim()
}
