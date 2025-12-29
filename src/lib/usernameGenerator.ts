const adjectives = [
  'Breezy', 'Cloudy', 'Fluffy', 'Gentle', 'Happy', 'Jolly', 'Mellow', 'Peaceful',
  'Quiet', 'Serene', 'Soft', 'Sunny', 'Swift', 'Warm', 'Wispy', 'Calm',
  'Dreamy', 'Floating', 'Glowing', 'Hazy', 'Light', 'Misty', 'Puffy', 'Silent',
  'Sleepy', 'Snowy', 'Starry', 'Still', 'Tender', 'Twilight', 'Velvet', 'Wandering'
];

const animals = [
  'Bunny', 'Cloud', 'Deer', 'Dolphin', 'Dove', 'Duck', 'Fox', 'Koala',
  'Lamb', 'Owl', 'Panda', 'Penguin', 'Puppy', 'Rabbit', 'Seal', 'Sloth',
  'Sparrow', 'Squirrel', 'Swan', 'Bear', 'Cat', 'Finch', 'Fawn', 'Hedgehog',
  'Kitten', 'Llama', 'Otter', 'Quail', 'Robin', 'Turtle', 'Whale', 'Wren'
];

const emojis = ['🌥️', '☁️', '🌤️', '✨', '🌸', '🍃', '🌊', '🌙'];

export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 100);
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  return `${emoji} ${adjective}${animal}${number}`;
}

export function generateUsernameWithoutEmoji(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 100);
  
  return `${adjective}${animal}${number}`;
}
