## Chatbot for IRCC website

This work in progress of a **chatbot** is designed as an AI companion to answer immigration-related questions about [Immigration, Refugees and Citizenship Canada (IRCC)](https://ircc.canada.ca/).

![](./docs/demo.png)

The AI chatbot uses a method called Retrieval Augmented Generation (RAG) to access official IRCC documentation online and provide accurate responses based on that information. The project is built on [Next.js](https://nextjs.org/).


## Getting Started

### Creating RAG Data

1. Copy and populate the content of [.env.example](./.env.example) to a `.env` file in the project root. You will need:

   1. An [OpenAI API key](https://platform.openai.com/api-keys) with access to `gpt-4o-mini` and `text-embedding-3-small` (to vectorize data).
   2. A connection string to a [MongoDB](https://www.mongodb.com/) instance (to store the vectorized data).

2. Download resources (html and pdf files) from IRCC's website (this will take several minutes):
   ```sh
   node scripts/download-resources.js
   ```
3. Create embeddings in a MongoDB database:
   ```sh
   node scripts/create-embeddings.js resources
   ```

### Running Locally

To start web server:

```sh
npm start
```

Optionally, you can use the CLI to interface with the agent (requires starting the server)

```sh
npm run cli
```

## To-do

- [ ] Vectorize and store data:
  - [x] Generate chunks and metadata from html files
  - [ ] Generate chunks and metadata from pdf files
  - [x] Vectorize chunks
  - [x] Store in database
- [ ] Provide references
  - [x] Ensure links to all relevant sources are included in the response
  - [ ] Link to text fragments in browser
- [x] Build and deploy a web UI
- [ ] Security
  - [ ] Prompt security
    - [x] Manual tests
    - [ ] Automate tests
  - [ ] Backend security
    - [x] Limit proxied routes to `canada.ca` domain only
    - [x] Limit query length 
    - [ ] Limit query rates