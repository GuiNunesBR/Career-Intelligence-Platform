import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:./sqlite.db',
});

async function main() {
  try {
    await client.execute("ALTER TABLE jobs ADD COLUMN url TEXT;");
    console.log("Column added");
  } catch (err) {
    console.error("Error adding column (maybe it exists):", err);
  }
}
main();
