export type ConstraintType = 'kong' | 'pung' | 'sequence' | 'pair' | 'single' | 'consecutive' | 'like';
export type SuitRole = 'first' | 'second' | 'third' | 'any' | 'none';
export type HandDifficulty = 'easy' | 'medium' | 'hard';
export interface PatternGroup {
    Group: string;
    Suit_Role: SuitRole;
    Suit_Note: string | null;
    Constraint_Type: ConstraintType;
    Constraint_Values: string;
    Constraint_Must_Match: string | null;
    Constraint_Extra: string | null;
    Jokers_Allowed: boolean;
    display_color: 'blue' | 'red' | 'green';
}
export interface NMJL2025Pattern {
    Year: number;
    Section: string | number;
    Line: number;
    'Pattern ID': number;
    Hands_Key: string;
    Hand_Pattern: string;
    Hand_Description: string;
    Hand_Points: number;
    Hand_Conceiled: boolean;
    Hand_Difficulty: HandDifficulty;
    Hand_Notes: string | null;
    Groups: PatternGroup[];
}
export interface PatternSelectionOption {
    id: string;
    patternId: number;
    displayName: string;
    pattern: string;
    points: number;
    difficulty: HandDifficulty;
    description: string;
    section: string | number;
    line: number;
    allowsJokers: boolean;
    concealed: boolean;
    groups: PatternGroup[];
}
export interface PatternProgress {
    patternId: number;
    completionPercentage: number;
    tilesNeeded: number;
    completingTiles: string[];
    canUseJokers: boolean;
    jokersNeeded: number;
}
//# sourceMappingURL=nmjl-types.d.ts.map