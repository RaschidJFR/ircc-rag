## IRCC Chatbot (RAG)
This is work in progress of a **chatbot** designed to answer immigration-related questions about [Immigration, Refugees and Citizenship Canada (IRCC)](https://ircc.canada.ca/). 
The chatbot uses a method called Retrieval Augmented Generation (RAG) to access official IRCC documentation online and provide accurate responses based on that information.

Currently, the bot is run from the command line.

**Prerequisites:**
1. A running [MongoDB](https://www.mongodb.com/) instance to store the vectorized data.
2. An [OpenAI API key](https://platform.openai.com/api-keys) with access to `gpt-4o-mini` and `text-embedding-3-small`.

**Getting Started:**

1. Install dependencies: `npm install`
2. Populate the `.env`file (see [`.env.example`](./.env.example))
3. Download resources (html and pdf files) from IRCC's website:`node scripts/download-resources.js`
4. Create embeddings in a MongoDB database: `node scripts/create-embeddings.js resources`
5. Start a chat session from the command line: `npm start`

**To do:**

- [ ] Vectorize and store data:
    - [x] Generate chunks and metadata from html files
    - [ ] Generate chunks and metadata from pdf files
    - [x] Vectorize chunks
    - [x] Store in database
- [ ] Ensure links to all relevant sources are included in the response
    - [ ] Link to text fragments in browser
- [ ] Build and deploy a web UI
- [ ] Test prompt security