export interface GoogleTokens {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token: string;
}

export interface GoogleUser {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

export interface GithubTokens {
    access_token: string;
    token_type: string;
    scope: string;
}

export interface GithubUser {
    login: string;
    id: number;
    avatar_url: string;
    name: string;
    email: string | null;
}

export interface GithubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: string | null;
}
