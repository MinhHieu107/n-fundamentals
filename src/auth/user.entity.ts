// src/auth/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  //Hash & salt password trong service xử lí từ lúc người dùng tạo tài khoản. Salt ở đây đang là mức 10
  // Việc lưu raw password sẽ dẫn đến vấn đề về bảo mật, nếu như là raw password thì nghĩa là người cầm data sẽ xem được toàn bộ
  // Và nếu mất data nghĩa là tất cả ttin của user cũng sẽ đi theo, vì thế khi pass được lưu sẽ hash sau đó lúc ktra sẽ check xem có hợp lệ k 
  @Column()
  password: string;

  
  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true })
  resetTokenExp: Date;

  @Column({ nullable: true })
googleId: string;

}

