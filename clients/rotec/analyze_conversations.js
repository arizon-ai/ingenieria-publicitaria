/**
 * Deep Conversation Analysis for Rotec
 * Analyzes cm-rotec.json to extract rich conversation insights
 */
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'input', 'cm-rotec.json'), 'utf8'));

// ---- Group by session ----
const sessions = {};
data.forEach(msg => {
    const sid = msg.session_id;
    if (!sessions[sid]) sessions[sid] = [];
    sessions[sid].push(msg);
});

const sessionIds = Object.keys(sessions);
console.log(`\n=== RESUMEN GENERAL ===`);
console.log(`Total mensajes: ${data.length}`);
console.log(`Sesiones unicas: ${sessionIds.length}`);
console.log(`Promedio msgs/sesion: ${(data.length / sessionIds.length).toFixed(1)}`);

// ---- Channel Distribution ----
console.log(`\n=== DISTRIBUCION POR CANAL ===`);
let whatsapp = 0, messenger = 0, instagram = 0, other_channel = 0;
sessionIds.forEach(sid => {
    if (sid.includes('@c.us')) whatsapp++;
    else if (sid.includes('@lid')) messenger++;  // Meta LID format
    else if (/^\d+$/.test(sid)) messenger++; // numeric = Messenger/Meta
    else other_channel++;
});
console.log(`WhatsApp: ${whatsapp} sesiones (${(whatsapp / sessionIds.length * 100).toFixed(1)}%)`);
console.log(`Messenger/Meta: ${messenger} sesiones (${(messenger / sessionIds.length * 100).toFixed(1)}%)`);
console.log(`Instagram: ${instagram} sesiones`);
console.log(`Otro: ${other_channel} sesiones`);

// ---- Conversation Depth ----
console.log(`\n=== PROFUNDIDAD DE CONVERSACION ===`);
const depths = { '1-2': 0, '3-5': 0, '6-10': 0, '11-20': 0, '20+': 0 };
sessionIds.forEach(sid => {
    const len = sessions[sid].length;
    if (len <= 2) depths['1-2']++;
    else if (len <= 5) depths['3-5']++;
    else if (len <= 10) depths['6-10']++;
    else if (len <= 20) depths['11-20']++;
    else depths['20+']++;
});
Object.entries(depths).forEach(([k, v]) => {
    console.log(`${k} mensajes: ${v} sesiones (${(v / sessionIds.length * 100).toFixed(1)}%)`);
});

// ---- Follow-up Agent Analysis ----
console.log(`\n=== AGENTE DE SEGUIMIENTO (FOLLOW-UP) ===`);
let followUpSessions = 0;
let followUpResponses = 0;
let followUpNoResponse = 0;
const followUpProducts = {};

sessionIds.forEach(sid => {
    const msgs = sessions[sid];
    const hasFollowUp = msgs.some(m => {
        const content = m.message?.content || '';
        return content.includes('IDENTIDAD, MISIÓN Y TONO') ||
            content.includes('AGENTE DE SEGUIMIENTO');
    });

    if (hasFollowUp) {
        followUpSessions++;

        // Find the follow-up message index
        const followUpIdx = msgs.findIndex(m => {
            const content = m.message?.content || '';
            return content.includes('IDENTIDAD, MISIÓN Y TONO');
        });

        if (followUpIdx >= 0) {
            // Check if there's a human response after the follow-up AI message
            const afterFollowUp = msgs.slice(followUpIdx + 1);
            const aiFollowUpMsg = afterFollowUp.find(m => m.message?.type === 'ai' &&
                !m.message?.content?.includes('IDENTIDAD'));
            const humanAfter = afterFollowUp.find(m => m.message?.type === 'human' &&
                !m.message?.content?.includes('IDENTIDAD'));

            if (humanAfter) {
                followUpResponses++;
            } else {
                followUpNoResponse++;
            }
        }

        // What product was discussed before follow-up?
        const beforeFollowUp = msgs.slice(0, msgs.findIndex(m =>
            (m.message?.content || '').includes('IDENTIDAD')));
        beforeFollowUp.forEach(m => {
            const content = (m.message?.content || '').toLowerCase();
            if (content.includes('compresor')) followUpProducts['Compresores'] = (followUpProducts['Compresores'] || 0) + 1;
            if (content.includes('motor')) followUpProducts['Motores'] = (followUpProducts['Motores'] || 0) + 1;
            if (content.includes('manguera')) followUpProducts['Mangueras'] = (followUpProducts['Mangueras'] || 0) + 1;
            if (content.includes('regulador')) followUpProducts['Reguladores'] = (followUpProducts['Reguladores'] || 0) + 1;
            if (content.includes('protector')) followUpProducts['Protectores'] = (followUpProducts['Protectores'] || 0) + 1;
            if (content.includes('correa')) followUpProducts['Correas'] = (followUpProducts['Correas'] || 0) + 1;
            if (content.includes('resistencia')) followUpProducts['Resistencias'] = (followUpProducts['Resistencias'] || 0) + 1;
            if (content.includes('ventilador')) followUpProducts['Ventiladores'] = (followUpProducts['Ventiladores'] || 0) + 1;
        });
    }
});

console.log(`Sesiones con Follow-Up Agent: ${followUpSessions}`);
console.log(`Respondieron al follow-up: ${followUpResponses} (${(followUpResponses / followUpSessions * 100).toFixed(1)}%)`);
console.log(`No respondieron: ${followUpNoResponse} (${(followUpNoResponse / followUpSessions * 100).toFixed(1)}%)`);
console.log(`Productos en sesiones de follow-up:`);
Object.entries(followUpProducts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
});

// ---- Lead Capture Analysis ----
console.log(`\n=== CAPTURA DE LEADS ===`);
let leadsWithPhone = 0;
let leadsWithName = 0;
let leadsWithLocation = 0;
const locations = {};

sessionIds.forEach(sid => {
    const msgs = sessions[sid];
    let hasPhone = false, hasName = false, hasLocation = false;

    msgs.forEach(m => {
        const content = m.message?.content || '';
        // Phone pattern
        if (/04\d{2}[\s-]?\d{3}[\s-]?\d{4}/.test(content) || /\+58/.test(content)) hasPhone = true;
        // Name pattern (after "nombre" in AI response followed by human)
        if (m.message?.type === 'human' && /[A-ZÁÉÍÓÚ][a-záéíóú]+ [A-ZÁÉÍÓÚ][a-záéíóú]+/.test(content) && content.length < 100) hasName = true;
    });

    // Extract location mentions
    msgs.forEach(m => {
        const content = (m.message?.content || '').toLowerCase();
        if (m.message?.type === 'human') {
            const locs = [
                ['caracas', 'Caracas'], ['maracay', 'Maracay'], ['valencia', 'Valencia'],
                ['maracaibo', 'Maracaibo'], ['barquisimeto', 'Barquisimeto'], ['lara', 'Lara'],
                ['trujillo', 'Trujillo'], ['anzoategui', 'Anzoategui'], ['zulia', 'Zulia'],
                ['aragua', 'Aragua'], ['carabobo', 'Carabobo'], ['guatire', 'Guatire'],
                ['la victoria', 'La Victoria'], ['puerto la cruz', 'Puerto La Cruz'],
                ['miranda', 'Miranda'], ['falcon', 'Falcon'], ['tachira', 'Tachira'],
                ['merida', 'Merida'], ['bolivar', 'Bolivar'], ['portuguesa', 'Portuguesa'],
                ['acarigua', 'Acarigua'], ['margarita', 'Margarita'], ['sucre', 'Sucre'],
                ['monagas', 'Monagas'], ['guarenas', 'Guarenas'], ['cojedes', 'Cojedes'],
                ['yaracuy', 'Yaracuy'], ['apure', 'Apure'], ['barinas', 'Barinas']
            ];
            locs.forEach(([key, label]) => {
                if (content.includes(key)) {
                    locations[label] = (locations[label] || 0) + 1;
                    hasLocation = true;
                }
            });
        }
    });

    if (hasPhone) leadsWithPhone++;
    if (hasName) leadsWithName++;
    if (hasLocation) leadsWithLocation++;
});

console.log(`Leads con telefono: ${leadsWithPhone}`);
console.log(`Leads con nombre completo: ${leadsWithName}`);
console.log(`Sesiones con ubicacion mencionada: ${leadsWithLocation}`);
console.log(`\nDistribucion geografica:`);
Object.entries(locations).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v} sesiones`);
});

// ---- Ari's Performance Analysis ----
console.log(`\n=== RENDIMIENTO DE ARI ===`);
let productFound = 0;
let productNotFound = 0;
let referredToAdvisor = 0;
let pricesGiven = 0;
let imageLinksShared = 0;
let duplicateResponses = 0;
let emptyResponses = 0;

sessionIds.forEach(sid => {
    const msgs = sessions[sid];
    const aiMsgs = msgs.filter(m => m.message?.type === 'ai');
    const prevContents = new Set();

    aiMsgs.forEach(m => {
        const content = m.message?.content || '';

        if (content === '') {
            emptyResponses++;
            return;
        }

        // Dedup check
        if (prevContents.has(content)) {
            duplicateResponses++;
            return;
        }
        prevContents.add(content);

        if (content.includes('Precio:') || content.includes('precio:') || /\$\d+/.test(content)) pricesGiven++;
        if (content.includes('drive.google.com') || content.includes('Ver imagen')) imageLinksShared++;
        if (content.includes('no he encontrado') || content.includes('no tenemos') || content.includes('no tengo')) productNotFound++;
        else if (content.includes('He encontrado') || content.includes('opciones')) productFound++;
        if (content.includes('asesor') || content.includes('contacto con un')) referredToAdvisor++;
    });
});

console.log(`Veces que encontro producto: ${productFound}`);
console.log(`Veces que NO encontro producto: ${productNotFound}`);
console.log(`Veces que compartio precios: ${pricesGiven}`);
console.log(`Veces que compartio imagenes: ${imageLinksShared}`);
console.log(`Referidos a asesor humano: ${referredToAdvisor}`);
console.log(`Respuestas duplicadas: ${duplicateResponses}`);
console.log(`Respuestas vacias: ${emptyResponses}`);
console.log(`Tasa de resolucion: ${(productFound / (productFound + productNotFound) * 100).toFixed(1)}%`);

// ---- Intent Classification (deeper) ----
console.log(`\n=== CLASIFICACION DE INTENCION (PROFUNDA) ===`);
const intents = {
    'Precio/Cotizacion': 0, 'Info tecnica/Producto': 0, 'Ubicacion/Envio': 0,
    'Compra directa': 0, 'Saludo/Inicial': 0, 'Seguimiento (Follow-up prompt)': 0,
    'Agradecimiento/Despedida': 0, 'Reclamo/Queja': 0, 'Solicitud de empleo': 0,
    'Propuesta comercial/B2B': 0, 'Patrocinio': 0, 'Imagen/Foto': 0,
    'Metodo de pago': 0, 'Disponibilidad': 0
};

sessionIds.forEach(sid => {
    const humanMsgs = sessions[sid].filter(m => m.message?.type === 'human');
    const sessionIntents = new Set();

    humanMsgs.forEach(m => {
        const content = (m.message?.content || '').toLowerCase();

        if (content.includes('identidad, misión')) { sessionIntents.add('Seguimiento (Follow-up prompt)'); return; }
        if (content.includes('descripcion imagen')) { sessionIntents.add('Imagen/Foto'); return; }

        if (content.includes('precio') || content.includes('cuanto') || content.includes('cuesta') || content.includes('costo')) sessionIntents.add('Precio/Cotizacion');
        if (content.includes('compresor') || content.includes('motor') || content.includes('regulador') || content.includes('correa') || content.includes('protector') || content.includes('resistencia') || content.includes('ventilador') || content.includes('manguera') || content.includes('nevera') || content.includes('lavadora') || content.includes('refrigerador')) sessionIntents.add('Info tecnica/Producto');
        if (content.includes('ubicacion') || content.includes('tienda') || content.includes('envio') || content.includes('envío') || content.includes('donde') || content.includes('dónde') || content.includes('maracay') || content.includes('caracas') || content.includes('maracaibo') || content.includes('valencia')) sessionIntents.add('Ubicacion/Envio');
        if (content.includes('comprar') || content.includes('pedido') || content.includes('quiero') || content.includes('compra')) sessionIntents.add('Compra directa');
        if (content.match(/^(hola|buenas|buenos|buen dia|saludos?)/)) sessionIntents.add('Saludo/Inicial');
        if (content.includes('gracias') || content.includes('hasta luego') || content.includes('feliz tarde') || content.includes('excelente')) sessionIntents.add('Agradecimiento/Despedida');
        if (content.includes('reclam') || content.includes('queja') || content.includes('problema') || content.includes('mal estado')) sessionIntents.add('Reclamo/Queja');
        if (content.includes('personal') || content.includes('empleo') || content.includes('trabajo') || content.includes('solicitan')) sessionIntents.add('Solicitud de empleo');
        if (content.includes('propuesta') || content.includes('representar') || content.includes('material publicitario') || content.includes('catálogo') || content.includes('distribuid')) sessionIntents.add('Propuesta comercial/B2B');
        if (content.includes('patrocin') || content.includes('apoyo') || content.includes('recurso')) sessionIntents.add('Patrocinio');
        if (content.includes('pago') || content.includes('transferencia') || content.includes('bolivares') || content.includes('bolívares')) sessionIntents.add('Metodo de pago');
        if (content.includes('tienen') || content.includes('tendran') || content.includes('tendrán') || content.includes('disponib')) sessionIntents.add('Disponibilidad');
    });

    sessionIntents.forEach(intent => intents[intent]++);
});

Object.entries(intents).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`${k}: ${v} sesiones (${(v / sessionIds.length * 100).toFixed(1)}%)`);
});

// ---- Top Products Asked ----
console.log(`\n=== PRODUCTOS MAS CONSULTADOS (EN CONVERSACIONES) ===`);
const products = {};
const productKeywords = {
    'Compresores': ['compresor'],
    'Motores (nevera/refrigerador)': ['motor', 'micro motor', 'micromotor'],
    'Protectores de voltaje': ['protector de voltaje', 'protector'],
    'Correas': ['correa'],
    'Reguladores de gas': ['regulador de gas', 'regulador'],
    'Mangueras': ['manguera'],
    'Resistencias': ['resistencia'],
    'Ventiladores': ['ventilador'],
    'Extractores': ['extractor'],
    'Capacitores': ['capacitor'],
    'Llaves': ['llave'],
    'Kits/Star Kit': ['kit', 'star kit'],
    'Termostatos': ['termostato'],
    'Valvulas': ['valvula', 'válvula']
};

sessionIds.forEach(sid => {
    const humanMsgs = sessions[sid].filter(m => m.message?.type === 'human');
    const sessionProducts = new Set();

    humanMsgs.forEach(m => {
        const content = (m.message?.content || '').toLowerCase();
        if (content.includes('identidad')) return; // skip follow-up prompts

        Object.entries(productKeywords).forEach(([product, keywords]) => {
            if (keywords.some(kw => content.includes(kw))) {
                sessionProducts.add(product);
            }
        });
    });

    sessionProducts.forEach(p => products[p] = (products[p] || 0) + 1);
});

Object.entries(products).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`${k}: ${v} sesiones (${(v / sessionIds.length * 100).toFixed(1)}%)`);
});

// ---- Brands Mentioned ----
console.log(`\n=== MARCAS MAS CONSULTADAS ===`);
const brands = {};
const brandKeywords = ['lg', 'samsung', 'mabe', 'haier', 'whirlpool', 'frigidaire', 'general electric', 'ge', 'electrolux', 'bosch', 'daewoo'];

sessionIds.forEach(sid => {
    const humanMsgs = sessions[sid].filter(m => m.message?.type === 'human');
    const sessionBrands = new Set();

    humanMsgs.forEach(m => {
        const content = (m.message?.content || '').toLowerCase();
        if (content.includes('identidad')) return;
        brandKeywords.forEach(brand => {
            if (content.includes(brand)) {
                sessionBrands.add(brand.toUpperCase());
            }
        });
    });

    sessionBrands.forEach(b => brands[b] = (brands[b] || 0) + 1);
});

Object.entries(brands).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`${k}: ${v} sesiones`);
});

// ---- Edge Cases / Non-Standard Inquiries ----
console.log(`\n=== CONSULTAS NO ESTANDAR ===`);
let spamB2B = 0, jobInquiries = 0, sponsorship = 0, offTopic = 0;
sessionIds.forEach(sid => {
    const allContent = sessions[sid].map(m => (m.message?.content || '').toLowerCase()).join(' ');
    if (allContent.includes('material publicitario') || allContent.includes('representar su marca') || allContent.includes('propuesta')) spamB2B++;
    if (allContent.includes('personal') || allContent.includes('empleo')) jobInquiries++;
    if (allContent.includes('patrocin') || allContent.includes('anzoategui fc') || allContent.includes('mencacup')) sponsorship++;
});
console.log(`Propuestas B2B/Publicidad: ${spamB2B}`);
console.log(`Solicitudes de empleo: ${jobInquiries}`);
console.log(`Patrocinios: ${sponsorship}`);

// ---- Economic Value ----
console.log(`\n=== VALOR ECONOMICO DE ARI ===`);
const totalSessions = sessionIds.length;
// Filter only real conversations (not follow-up prompts only)
const realSessions = sessionIds.filter(sid => {
    const humanMsgs = sessions[sid].filter(m => m.message?.type === 'human');
    // At least one real human message (not follow-up prompt)
    return humanMsgs.some(m => !(m.message?.content || '').includes('IDENTIDAD'));
});
console.log(`Sesiones con interaccion real: ${realSessions.length}`);
console.log(`Sesiones solo de follow-up: ${totalSessions - realSessions.length}`);

// Calc: time to handle 1 session manually = ~5 min
const totalMinutes = realSessions.length * 5;
const totalHours = totalMinutes / 60;
const workDays = totalHours / 8;
console.log(`Tiempo estimado para manejar manualmente: ${totalHours.toFixed(0)} horas (${workDays.toFixed(1)} dias laborales)`);
console.log(`Costo equivalente a 1 empleado: $${(workDays * 15).toFixed(0)} (a $15/dia)`);

// ---- Write results to JSON ----
const results = {
    summary: {
        totalMessages: data.length,
        uniqueSessions: sessionIds.length,
        realSessions: realSessions.length,
        avgMessagesPerSession: parseFloat((data.length / sessionIds.length).toFixed(1))
    },
    channelDistribution: { whatsapp, messenger, instagram, other: other_channel },
    conversationDepth: depths,
    followUp: {
        totalSessions: followUpSessions,
        responded: followUpResponses,
        noResponse: followUpNoResponse,
        responseRate: parseFloat((followUpResponses / followUpSessions * 100).toFixed(1)),
        products: followUpProducts
    },
    leadCapture: {
        withPhone: leadsWithPhone,
        withName: leadsWithName,
        withLocation: leadsWithLocation,
        geographicDistribution: locations
    },
    ariPerformance: {
        productFound, productNotFound, pricesGiven, imageLinksShared,
        referredToAdvisor, duplicateResponses, emptyResponses,
        resolutionRate: parseFloat((productFound / (productFound + productNotFound) * 100).toFixed(1))
    },
    intents,
    productsAsked: products,
    brandsMentioned: brands,
    economicValue: {
        totalManualHours: parseFloat(totalHours.toFixed(0)),
        workDays: parseFloat(workDays.toFixed(1)),
        costEquivalent: parseFloat((workDays * 15).toFixed(0))
    }
};

fs.writeFileSync(
    path.join(__dirname, 'analysis', 'conversation_analysis.json'),
    JSON.stringify(results, null, 2)
);

console.log('\n✅ Resultados guardados en analysis/conversation_analysis.json');
