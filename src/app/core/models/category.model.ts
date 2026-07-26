/** A user-created custom category (icon + color chosen at creation time). */
export interface Category {
  id?: number;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
