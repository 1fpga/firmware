-- Play sessions.
CREATE TABLE Sessions
(
    id            INTEGER PRIMARY KEY,
    -- Which account played.
    usersId       INTEGER   NOT NULL REFERENCES Users (id),
    -- Which game was played.
    gamesId       INTEGER REFERENCES Games (id) ON DELETE CASCADE,
    -- When was it started.
    startedAt     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- How long was it played.
    secondsPlayed INTEGER            DEFAULT 1,
    CONSTRAINT sessionUsersGamesStartedAt UNIQUE (usersId, gamesId, startedAt)
);
