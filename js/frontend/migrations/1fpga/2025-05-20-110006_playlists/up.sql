-- Add your migration here. Comments will be removed.

CREATE TABLE Playlists
(
    id       INTEGER PRIMARY KEY,
    name     TEXT    NOT NULL,
    -- Who owns it, ie. can add/remove games and delete it.
    usersId  INTEGER NOT NULL REFERENCES Users (id),
    -- Whether everyone can see this playlist or not.
    isPublic BOOLEAN DEFAULT FALSE,
    CONSTRAINT PlaylistsNameUsersIdUnique UNIQUE (name, usersId)
);

CREATE TABLE PlaylistsGames
(
    playlistsId INTEGER REFERENCES Playlists (id) ON DELETE CASCADE,
    gamesId     INTEGER REFERENCES Games (id) ON DELETE CASCADE,
    CONSTRAINT PlaylistsGamesPlaylistsIdGamesIdUnique UNIQUE (playlistsId, gamesId)
);

-- TODO: add a PlaylistsPlaylists for playlists including other playlists

-- TODO: add a PlaylistsUsers parental control.
