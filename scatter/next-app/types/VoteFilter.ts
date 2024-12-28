/**
 * Interface for filtering votes in cluster visualization
 */
export interface VoteFilter {
  /**
   * Filter function that determines whether an argument should be included
   * @param arg - The argument to filter
   * @returns true if the argument should be included, false otherwise
   */
  filter: (arg: any) => boolean;
}
