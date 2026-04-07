export default function DetailPanel({ game }) {
    if (!game) {
        return (
            <div className="detail-empty">
                <p>Click a point on the map to explore a game.</p>
            </div>
        );
    }

    const score = game.Positive + game.Negative > 0
        ? Math.round((game.Positive / (game.Positive + game.Negative)) * 100)
        : null;

    return (
        <div className="detail-panel">
            {game.image && (
                <img src={game.image} alt={game.Name} className="detail-image" />
            )}

            <h2 className="detail-name">{game.Name}</h2>

            {game.Developers && (
                <p className="detail-dev">by {game.Developers}</p>
            )}

            <div className="detail-meta">
                {game["Release date"] && <span>{game["Release date"]}</span>}
                {game.Price > 0 && <span>${game.Price}</span>}
                {game.Price === 0 && <span>Free</span>}
                {score !== null && <span>{score}% positive</span>}
            </div>

            {game.Genres && (
                <div className="detail-tags">
                    {game.Genres.split(",").map((g) => (
                        <span key={g} className="tag genre-tag">{g.trim()}</span>
                    ))}
                </div>
            )}

            {game.Tags && (
                <div className="detail-tags">
                    {game.Tags.split(",").slice(0, 8).map((t) => (
                        <span key={t} className="tag">{t.trim()}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
