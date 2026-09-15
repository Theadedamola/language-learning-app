export interface ConversationTheme {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: string;
  situation: string;
  recommendedLevel: number;
  starterQuestion: string;
}

export interface LanguageModule {
  id: string;
  name: string;
  nativeName: string;
  variety: string;
  locale: string;
  greeting: string;
  greetingWord: string;
  speechGuidance: string;
  writingGuidance: string;
  lemmaGuidance: string;
  teachingFocus: string[];
  topicPlaceholder: string;
  lookupUnavailableReply: string;
  themes: ConversationTheme[];
}

export const spanishModule: LanguageModule = {
  id: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  variety: 'Spain & International',
  locale: 'es-ES',
  greeting: '¡Hola!',
  greetingWord: 'hola',
  speechGuidance:
    'Use clear, warm Spanish. Distinguish naturally between s and z/soft c when speaking Castilian, but accept seseo, voseo, and Latin American regional forms without marking them wrong. Speak at a clear, encouraging pace.',
  writingGuidance:
    'Use standard Spanish spelling and accents (tildes).',
  lemmaGuidance:
    'Give nouns with their singular grammatical article (e.g., la casa, el libro) and verbs in the infinitive (e.g., hablar, comer). Keep reflexive verbs distinct (e.g., llamarse). Preserve accents and ñ.',
  teachingFocus: [
    'Greetings, introductions, basic needs, and short useful chunks such as "me llamo", "quiero", and "por favor".',
    'Everyday questions, gender and number agreement, present tense, and useful ser vs estar contrasts.',
    'Connected stories, past events (pretérito indefinido vs imperfecto), object pronouns, and familiar situations.',
    'Reasons, opinions, expressing feelings, and common present subjunctive contexts (quiero que..., ojalá).',
    'Nuance, hypothetical situations (condicional), past subjunctive, register, and regional expressions.',
    'Flexible advanced discussion with natural idiomatic Spanish, debate, and cultural depth.',
  ],
  topicPlaceholder: 'Food, travel, music, life in Spain or Latin America…',
  lookupUnavailableReply:
    'No he podido comprobar esa palabra ahora mismo. Si quieres, podemos seguir charlando.',
  themes: [
    {
      id: 'coffee',
      title: 'Coffee in the Neighborhood',
      subtitle: 'Order something warm and chat',
      icon: 'Coffee',
      category: 'Daily Life',
      situation:
        'Estás en una cafetería de barrio en España. Pide una bebida (un café con leche, un cortado) y algo para desayunar o merendar. Conversa amigablemente con el camarero sobre tu día.',
      recommendedLevel: 0,
      starterQuestion:
        '¡Hola! Bienvenido a nuestra cafetería. ¿Qué te gustaría tomar hoy, un café con leche o prefieres otra cosa?',
    },
    {
      id: 'groceries',
      title: 'At the Local Market',
      subtitle: 'Buy fruit, cheese and bread',
      icon: 'ShoppingBasket',
      category: 'Daily Life',
      situation:
        'Visitas los puestos de un mercado tradicional. Pregunta por los precios, pide cantidades (medio kilo de tomates, cien gramos de jamón) y pide recomendaciones sobre productos frescos de temporada.',
      recommendedLevel: 1,
      starterQuestion:
        '¡Hola, buenos días! Tenemos fruta fresca y quesos riquísimos hoy. ¿Qué te apetece llevarte?',
    },
    {
      id: 'tapas',
      title: 'Tapas with Friends',
      subtitle: 'Choose dishes to share',
      icon: 'Utensils',
      category: 'Culture & Food',
      situation:
        'Es la hora del aperitivo y estás en un bar concurrido. Comenta las opciones de la pizarra (tortilla de patatas, patatas bravas, croquetas, calamares) y decide qué pedir para compartir mientras charláis de aficiones.',
      recommendedLevel: 1,
      starterQuestion:
        '¡Hola! Qué bien verte aquí en el bar. ¿Qué tapa te apetece pedir primero para compartir?',
    },
    {
      id: 'travel',
      title: 'Planning a Getaway',
      subtitle: 'Tickets, schedules and destinations',
      icon: 'Train',
      category: 'Travel',
      situation:
        'Estás en la estación o hablando con un compañero de viaje sobre un viaje de fin de semana. Decide si viajar en tren o autobús, reserva billetes y habla sobre qué monumentos o playas visitar.',
      recommendedLevel: 2,
      starterQuestion:
        '¡Hola! Qué ganas tengo de viajar este fin de semana. ¿Prefieres que vayamos a la costa o a visitar un pueblo de montaña?',
    },
    {
      id: 'sobremesa',
      title: 'After-Meal Chat',
      subtitle: 'Conversation after the meal',
      icon: 'MessageCircle',
      category: 'Culture & Society',
      situation:
        'La comida ha terminado, pero nadie se levanta de la mesa. Disfruta de una charla distendida sobre anécdotas personales, familia, tradiciones culturales y planes para el futuro.',
      recommendedLevel: 2,
      starterQuestion:
        '¡Qué comida tan deliciosa hemos compartido! ¿Te apetece un cafecito o una infusión mientras seguimos charlando?',
    },
    {
      id: 'city-walk',
      title: 'Lost in the Old Town',
      subtitle: 'Ask for directions and discover hidden spots',
      icon: 'MapPin',
      category: 'City',
      situation:
        'Buscas una plaza o museo histórico pero te has desorientado en las callejuelas. Pregunta a un transeúnte cómo llegar y aprovecha para pedirle qué lugar con encanto recomienda visitar.',
      recommendedLevel: 1,
      starterQuestion:
        '¡Hola! Te veo mirando el mapa, conozco muy bien este casco histórico. ¿Buscas alguna calle o una plaza bonita donde descansar?',
    },
    {
      id: 'cinema-culture',
      title: 'Cinema, Music & Books',
      subtitle: 'Share tastes and opinions',
      icon: 'Film',
      category: 'Arts & Leisure',
      situation:
        'Habla sobre una película, serie o canción en español que te haya gustado o llamado la atención. Explica por qué te emocionó o qué opinas de sus personajes.',
      recommendedLevel: 3,
      starterQuestion:
        '¡Hola! Me encanta descubrir música y películas nuevas. ¿Has escuchado alguna canción o visto alguna serie en español últimamente?',
    },
    {
      id: 'free',
      title: 'Free Conversation',
      subtitle: 'Talk about whatever you like',
      icon: 'Sparkles',
      category: 'Free',
      situation:
        'Charla abierta sobre tus aficiones, cómo ha ido tu día, planes o cualquier curiosidad. Déjate guiar por el flujo natural de la conversación.',
      recommendedLevel: 0,
      starterQuestion:
        '¡Hola! Qué alegría charlar contigo. ¿Cómo estás hoy y cómo va tu día?',
    },
  ],
};
