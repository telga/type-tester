const BASE_URL = 'https://api.datamuse.com/words'
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest='
const JISHO_SEARCH_BASE = 'https://jisho.org/api/v1/search/words?keyword='

// Define fallback words at the top
const FALLBACK_WORDS = [
  'たべる', 'のむ', 'よむ', 'かく', 'はなす',
  'あるく', 'みる', 'きく', 'ねる', 'おきる',
  'いく', 'くる', 'する', 'やる', 'あそぶ',
  'あつい', 'さむい', 'たかい', 'ひくい', 'おおきい',
  'ちいさい', 'むずかしい', 'やさしい', 'おもしろい', 'たのしい',
  'いぬ', 'ねこ', 'とり', 'さかな', 'うま',
  'やま', 'かわ', 'うみ', 'そら', 'ほし'
];

import { JAPANESE_WORDS } from '../data/japaneseWords';

export const generateWords = async (count, language = 'en') => {
  if (language === 'ja') {
    try {
      // Flatten all categories into one array
      const allWords = Object.values(JAPANESE_WORDS).flat();
      
      // Shuffle the array
      const shuffled = [...allWords].sort(() => 0.5 - Math.random());
      
      // Take the required number of words
      const selectedWords = shuffled.slice(0, count);
      
      return selectedWords.join(' ');
      
    } catch (error) {
      console.error('Error selecting Japanese words:', error);
      // Use verbs as fallback if something goes wrong
      const shuffled = [...JAPANESE_WORDS.verbs].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count).join(' ');
    }
  }

  try {
    const words = []
    
    const requests = Array(count).fill().map(() => {
      const randomLength = Math.floor(Math.random() * 5) + 3
      const randomType = Math.random() < 0.33 ? 'rel_jja=good' :
                        Math.random() < 0.66 ? 'rel_jjb=word' :
                        'ml=action'
      
      const params = new URLSearchParams({
        max: '100',
        md: 'f',
        [randomType.split('=')[0]]: randomType.split('=')[1]
      })

      return fetch(`${BASE_URL}?${params}`)
    })
    
    const responses = await Promise.all(requests)
    const jsonResponses = await Promise.all(
      responses.map(response => response.json())
    )

    const selectedWords = jsonResponses.map(wordList => {
      const targetLength = Math.floor(Math.random() * 5) + 3
      
      const validWords = wordList.filter(w => w.word.length === targetLength)

      if (validWords.length > 0) {
        return validWords[Math.floor(Math.random() * validWords.length)].word
      }
      
      const anyLengthWords = wordList.filter(w => 
        w.word.length >= 3 && w.word.length <= 7
      )
      
      if (anyLengthWords.length > 0) {
        return anyLengthWords[Math.floor(Math.random() * anyLengthWords.length)].word
      }
      
      return 'word'
    })
    
    return selectedWords.join(' ')

  } catch (error) {
    console.error('Error fetching words:', error)
    return 'Error loading words. Please try again.'
  }
} 