import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const dbConfig = {
  user: "aaysha",
  hostname: "asdfasdfasd.us-west-2.aws.neon.tech",
  port: 5432,
  password: "asdfasdasdf",
  database: "asdfasdfasdf",
  ssl: true,
  sslmode: "require",
};

export async function insert_user(
  user_name: string,
): Promise<
  { id: string; name: string; created_at: string } | { message: string } | {
    error: string;
  } | {}
> {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    const result = await client.queryObject({
      text: `INSERT INTO users(name) VALUES ('${user_name}') RETURNING *`,
    });

    if (result && result.rows.length > 0 && result.rows[0]) {
      return result.rows[0];
    } else {
      return { message: "Insert Failed" };
    }
  } catch (error) {
    console.error("Error:", error);
    return { error: "Error: " + error.message };
  } finally {
    await client.end();
  }
}

export async function insert_todos(
    user_id: string,
    todo: string
  ): Promise<
    { id: string; user_id: string; todo: string; created_at: string } | { message: string } | {
      error: string;
    } | {}
  > {
    const client = new Client(dbConfig);
  
    try {
      await client.connect();
      

      // Check if the user exists in the users table

      const userExistsQuery = await client.queryObject({
        text: `SELECT id FROM users where id =${user_id}`
      })

      if (userExistsQuery.rows.length === 0) {
        return { message: "User not found. Insert Failed" };
      }
      const result = await client.queryObject({
        text: `INSERT INTO todos(user_id,todo) VALUES ('${user_id}','${todo}') RETURNING *`,
      });
     
      if (result && result.rows.length > 0 && result.rows[0]) {
        return result.rows[0];
      } else {
        return { message: "Insert Failed" };
      }
    } catch (error) {
      console.error("Error:", error);
      return { error: "Error: " + error.message };
    } finally {
      await client.end();
    }
  }


  export async function delete_todos(
    todo_id: string
  ){
    const client = new Client(dbConfig);
    try{
      await  client.connect();

      const result = await client.queryObject({ text: `DELETE FROM todos WHERE id =${todo_id}`})
      if(result.rowCount===1){
        return `Deleted todo with id= ${todo_id} sucesssfully`
      }else{
        return "Deletion unsucessfull"
      }
    }catch(error){
        return "Error : "+ error.message
    }finally{
        client.end();
    }

  }