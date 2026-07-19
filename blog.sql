-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jul 19, 2026 at 02:13 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `blog`
--
CREATE DATABASE IF NOT EXISTS `blog` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `blog`;

-- --------------------------------------------------------

--
-- Table structure for table `account`
--
-- Creation: Jul 06, 2026 at 03:33 PM
-- Last update: Jul 18, 2026 at 08:26 AM
--

CREATE TABLE `account` (
  `id` varchar(191) NOT NULL,
  `accountId` text NOT NULL,
  `providerId` text NOT NULL,
  `userId` varchar(191) NOT NULL,
  `accessToken` text DEFAULT NULL,
  `refreshToken` text DEFAULT NULL,
  `idToken` text DEFAULT NULL,
  `accessTokenExpiresAt` datetime(3) DEFAULT NULL,
  `refreshTokenExpiresAt` datetime(3) DEFAULT NULL,
  `scope` text DEFAULT NULL,
  `password` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `account`:
--   `userId`
--       `user` -> `id`
--

--
-- Dumping data for table `account`
--

INSERT INTO `account` (`id`, `accountId`, `providerId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password`, `createdAt`, `updatedAt`) VALUES
('N2fYtbrxu16xI9WurMtgEkHrMGGdQf4f', 'RvEuhd9njCkwZ9Qy2azxbRDZiSTu08Z4', 'credential', 'RvEuhd9njCkwZ9Qy2azxbRDZiSTu08Z4', NULL, NULL, NULL, NULL, NULL, NULL, 'e96f23d6b15c752916139674d080c8c8:b2d9cba67b028d3244333ece86fbfbbf10ec87d438540d45c6fbf876215818cfd6ba7010dc19e8349e78623134b593c2e45e68bcf20c7c1f5fcc065e95a17d7b', '2026-07-18 08:26:23.716', '2026-07-18 08:26:23.716'),
('nKe6xCopJoUVr2pbFRQNkV1zGfodQzFo', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', 'credential', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', NULL, NULL, NULL, NULL, NULL, NULL, '2cff2241f0e77dad45df651239d46a4d:bafd2f1b8a7970b1d1df5fc350f85b4015ae2556af316edae7a9885eb7037624b042dc1f16102817d07cd93a4406e8eb61392ffc37bf638861736b51bfc86fef', '2026-07-06 15:34:55.664', '2026-07-18 06:41:03.916');

-- --------------------------------------------------------

--
-- Table structure for table `Post`
--
-- Creation: Jul 06, 2026 at 03:33 PM
-- Last update: Jul 18, 2026 at 08:23 AM
--

CREATE TABLE `Post` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `excerpt` text NOT NULL,
  `date` datetime(3) NOT NULL,
  `category` varchar(191) NOT NULL,
  `image` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`content`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `Post`:
--   `userId`
--       `user` -> `id`
--

--
-- Dumping data for table `Post`
--

INSERT INTO `Post` (`id`, `title`, `excerpt`, `date`, `category`, `image`, `userId`, `content`) VALUES
(1, 'The Future of Full-stack React', 'Exploring why TanStack Start is changing the game for React developers...', '2024-05-20 00:00:00.000', 'Engineering', 'https://picsum.photos/seed/post1/800/450', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '\"\"'),
(2, 'Mastering Type-Safe Routing', 'How to leverage TypeScript to never write a broken link again.', '2024-05-18 00:00:00.000', 'TypeScript', 'https://picsum.photos/seed/post2/800/450', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '\"\"'),
(3, 'Server Functions Explained', 'Bridge the gap between your frontend and backend seamlessly.', '2024-05-15 00:00:00.000', 'Backend', 'https://picsum.photos/seed/post3/800/450', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '\"\"'),
(4, 'bom', '', '2026-07-06 15:35:32.151', '', 'https://s3.cakwei.dev/blog/730400be-ec0c-4d0b-ba68-12e58f6a6723-image-removebg-preview.png', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"BOMBOMB\"}]}]}'),
(5, 'bom', '', '2026-07-18 07:41:34.919', 'Technology,Engineering,Design,Medical', 'https://s3.cakwei.dev/blog/618d8268-cd29-4ac6-b1cf-e06009d8f1b3-(6)-Gingerol.png', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"Chemistry tags test\"}]}]}'),
(6, 'bom', '', '2026-07-18 08:23:54.437', 'Design', 'https://s3.cakwei.dev/blog/e022f074-7c6c-4c4b-8ebf-3e7b536e28d8-image_2026-04-22_11-51-29.png', '3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', '{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"attrs\":{\"textAlign\":null},\"content\":[{\"type\":\"text\",\"text\":\"Testing disabling\"}]}]}');

-- --------------------------------------------------------

--
-- Table structure for table `session`
--
-- Creation: Jul 06, 2026 at 03:33 PM
-- Last update: Jul 19, 2026 at 10:42 AM
--

CREATE TABLE `session` (
  `id` varchar(191) NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `token` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `ipAddress` text DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `userId` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `session`:
--   `userId`
--       `user` -> `id`
--

--
-- Dumping data for table `session`
--

INSERT INTO `session` (`id`, `expiresAt`, `token`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`, `userId`) VALUES
('9RTjwQCICLADCjEGlJci4xz4MCx8d6FI', '2026-07-26 10:42:48.147', '0gBfyM0hnPpjTZQ60XT9YOqaaZVbPWGX', '2026-07-19 10:42:48.147', '2026-07-19 10:42:48.147', '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5.2 Safari/605.1.15', 'RvEuhd9njCkwZ9Qy2azxbRDZiSTu08Z4');

-- --------------------------------------------------------

--
-- Table structure for table `Todo`
--
-- Creation: Jul 06, 2026 at 03:33 PM
--

CREATE TABLE `Todo` (
  `id` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `Todo`:
--

-- --------------------------------------------------------

--
-- Table structure for table `user`
--
-- Creation: Jul 06, 2026 at 03:33 PM
-- Last update: Jul 18, 2026 at 08:26 AM
--

CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `name` text NOT NULL,
  `email` varchar(191) NOT NULL,
  `emailVerified` tinyint(1) NOT NULL DEFAULT 0,
  `image` text DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `username` varchar(191) DEFAULT NULL,
  `displayUsername` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `user`:
--

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`, `username`, `displayUsername`) VALUES
('3i7dT5R7ZUlaVaSXOKxdezY3SWkEThn0', 'Charlee Tan', 'charleetan2020@gmail.com', 0, NULL, '2026-07-06 15:34:55.662', '2026-07-06 15:34:55.662', 'cakwei', 'Cakwei'),
('RvEuhd9njCkwZ9Qy2azxbRDZiSTu08Z4', 'Charlee Tan', 'charleetan121@gmail.com', 0, NULL, '2026-07-18 08:26:23.708', '2026-07-18 08:26:23.708', 'cakweitiao', 'CakweiTiao');

-- --------------------------------------------------------

--
-- Table structure for table `verification`
--
-- Creation: Jul 06, 2026 at 03:33 PM
--

CREATE TABLE `verification` (
  `id` varchar(191) NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- RELATIONSHIPS FOR TABLE `verification`:
--

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account`
--
ALTER TABLE `account`
  ADD PRIMARY KEY (`id`),
  ADD KEY `account_userId_idx` (`userId`);

--
-- Indexes for table `Post`
--
ALTER TABLE `Post`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Post_userId_fkey` (`userId`);

--
-- Indexes for table `session`
--
ALTER TABLE `session`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token_key` (`token`),
  ADD KEY `session_userId_idx` (`userId`);

--
-- Indexes for table `Todo`
--
ALTER TABLE `Todo`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_email_key` (`email`),
  ADD UNIQUE KEY `user_username_key` (`username`);

--
-- Indexes for table `verification`
--
ALTER TABLE `verification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `verification_identifier_idx` (`identifier`(191));

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Post`
--
ALTER TABLE `Post`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `Todo`
--
ALTER TABLE `Todo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account`
--
ALTER TABLE `account`
  ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `Post`
--
ALTER TABLE `Post`
  ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `session`
--
ALTER TABLE `session`
  ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
