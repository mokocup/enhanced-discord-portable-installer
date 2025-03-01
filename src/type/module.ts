export interface Module {
    repository: string;
    install: (path: string) => Promise<boolean>;
}