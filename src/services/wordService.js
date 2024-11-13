const BASE_URL = 'https://api.datamuse.com/words'

export async function generateWords(count) {
  try {
    const words = []
    
    // Make parallel requests for better performance
    const requests = Array(count).fill().map(() => {
      const randomLength = Math.floor(Math.random() * 5) + 3 // Random number 3-7
      const randomType = Math.random() < 0.33 ? 'rel_jja=good' : // nouns
                        Math.random() < 0.66 ? 'rel_jjb=word' : // verbs
                        'ml=action' // adjectives
      
      // Construct URL with parameters
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

    console.log('API Responses:', jsonResponses) // Debug log

    // Process each response to get a word of the desired length
    const selectedWords = jsonResponses.map(wordList => {
      const targetLength = Math.floor(Math.random() * 5) + 3 // 3-7
      console.log('Target length:', targetLength) // Debug log
      
      // Filter words by length
      const validWords = wordList.filter(w => {
        console.log('Checking word:', w.word, 'length:', w.word.length) // Debug log
        return w.word.length === targetLength
      })

      console.log('Valid words:', validWords) // Debug log

      if (validWords.length > 0) {
        const selectedWord = validWords[Math.floor(Math.random() * validWords.length)].word
        console.log('Selected word:', selectedWord) // Debug log
        return selectedWord
      }
      
      // If no words match the length, try any length between 3-7
      const anyLengthWords = wordList.filter(w => 
        w.word.length >= 3 && w.word.length <= 7
      )
      
      if (anyLengthWords.length > 0) {
        return anyLengthWords[Math.floor(Math.random() * anyLengthWords.length)].word
      }
      
      return 'word' // Last resort fallback
    })
    
    console.log('Final words:', selectedWords) // Debug log
    return selectedWords.join(' ')

  } catch (error) {
    console.error('Error fetching words:', error)
    return 'Error loading words. Please try again.'
  }
} 