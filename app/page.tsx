import { GetHitokoto } from "../utils/hitokoto";

export default async function TagPage(props) {
  const hito = await GetHitokoto();
  return (
    <>
      <h1>Archives</h1>
      {hito != null && (
        <div>
          {hito.hitokoto} —— {hito.from_who ?? hito.from}
        </div>
      )}
    </>
  );
}
