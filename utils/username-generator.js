const generateUsername = (name) => {
  if (!name) {
    throw new Error('Name is required for username generation');
  }
  
  // Remove spaces and convert to lowercase
  const cleanName = name.toLowerCase().replace(/\s+/g, '');
  
  // Take first 4 characters of name (or less if name is shorter)
  const namePrefix = cleanName.slice(0, Math.min(4, cleanName.length));
  
  // Generate 4 random numbers
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  // Combine name prefix with random numbers
  const username = `${namePrefix}${randomNum}`;
  
  return username;
};

// Function to ensure username is unique in a collection
const ensureUniqueUsername = async (username, collection) => {
  if (!username || !collection) {
    throw new Error('Username and collection are required');
  }

  const existingUser = await collection.findOne({ username });
  if (!existingUser) {
    return username;
  }
  
  // If username exists, add a random character and try again
  const newUsername = username + String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return ensureUniqueUsername(newUsername, collection);
};

module.exports = {
  generateUsername,
  ensureUniqueUsername
}; 