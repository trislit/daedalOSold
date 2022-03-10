import type { ApiError } from "browserfs/dist/node/core/api_error";
import type Stats from "browserfs/dist/node/core/node_fs_stats";
import {
  filterSystemFiles,
  getIconByFileExtension,
  getShortcutInfo,
} from "components/system/Files/FileEntry/functions";
import type { FileStat } from "components/system/Files/FileManager/functions";
import {
  findPathsRecursive,
  sortContents,
} from "components/system/Files/FileManager/functions";
import type { FocusEntryFunctions } from "components/system/Files/FileManager/useFocusableEntries";
import type {
  SetSortBy,
  SortByOrder,
} from "components/system/Files/FileManager/useSortBy";
import useSortBy from "components/system/Files/FileManager/useSortBy";
import { useFileSystem } from "contexts/fileSystem";
import { useProcesses } from "contexts/process";
import { useSession } from "contexts/session";
import type { AsyncZippable } from "fflate";
import ini from "ini";
import { basename, dirname, extname, join, relative } from "path";
import { useCallback, useEffect, useState } from "react";
import {
  FOLDER_ICON,
  INVALID_FILE_CHARACTERS,
  MOUNTABLE_EXTENSIONS,
  SHORTCUT_APPEND,
  SHORTCUT_EXTENSION,
} from "utils/constants";
import { bufferToUrl, cleanUpBufferUrl } from "utils/functions";
import { unrar, unzip } from "utils/zipFunctions";

export type FileActions = {
  archiveFiles: (paths: string[]) => void;
  deleteLocalPath: (path: string) => Promise<void>;
  downloadFiles: (paths: string[]) => void;
  extractFiles: (path: string) => void;
  newShortcut: (path: string, process: string) => void;
  renameFile: (path: string, name?: string) => void;
};

export type FolderActions = {
  addToFolder: () => void;
  newPath: (
    path: string,
    buffer?: Buffer,
    thenRename?: boolean
  ) => Promise<void>;
  pasteToFolder: () => void;
  resetFiles: () => void;
  sortByOrder: [SortByOrder, SetSortBy];
};

type ZipFile = [string, Buffer];

export type Files = Record<string, FileStat>;

type Folder = {
  fileActions: FileActions;
  folderActions: FolderActions;
  files: Files;
  isLoading: boolean;
  updateFiles: (newFile?: string, oldFile?: string) => void;
};

const NO_FILES = undefined;

const useFolder = (
  directory: string,
  setRenaming: React.Dispatch<React.SetStateAction<string>>,
  { blurEntry, focusEntry }: FocusEntryFunctions,
  hideFolders = false,
  hideLoading = false
): Folder => {
  const [files, setFiles] = useState<Files | typeof NO_FILES>();
  const [downloadLink, setDownloadLink] = useState("");
  const [isLoading, setLoading] = useState(true);
  const {
    addFile,
    addFsWatcher,
    copyEntries,
    createPath,
    deletePath,
    exists,
    fs,
    mkdir,
    mkdirRecursive,
    pasteList,
    readdir,
    readFile,
    removeFsWatcher,
    rename,
    stat,
    updateFolder,
    writeFile,
  } = useFileSystem();
  const {
    sessionLoaded,
    setSortOrder,
    sortOrders: { [directory]: [sortOrder] = [] } = {},
  } = useSession();
  const [currentDirectory, setCurrentDirectory] = useState(directory);
  const { closeProcessesByUrl } = useProcesses();
  const statsWithShortcutInfo = useCallback(
    async (fileName: string, stats: Stats): Promise<FileStat> => {
      if (extname(fileName).toLowerCase() === SHORTCUT_EXTENSION) {
        const contents = await readFile(join(directory, fileName));

        return Object.assign(stats, {
          systemShortcut: getShortcutInfo(contents).type === "System",
        });
      }

      return stats;
    },
    [directory, readFile]
  );
  const updateFiles = useCallback(
    async (newFile?: string, oldFile?: string, customSortOrder?: string[]) => {
      if (oldFile) {
        if (!(await exists(join(directory, oldFile)))) {
          const oldName = basename(oldFile);

          if (newFile) {
            setFiles((currentFiles = {}) =>
              Object.entries(currentFiles).reduce<Files>(
                (newFiles, [fileName, fileStats]) => ({
                  ...newFiles,
                  [fileName === oldName ? basename(newFile) : fileName]:
                    fileStats,
                }),
                {}
              )
            );
          } else {
            blurEntry(oldName);
            setFiles(
              ({ [oldName]: _fileStats, ...currentFiles } = {}) => currentFiles
            );
          }
        }
      } else if (newFile) {
        const baseName = basename(newFile);
        const allStats = await statsWithShortcutInfo(
          baseName,
          await stat(join(directory, newFile))
        );

        setFiles((currentFiles = {}) => ({
          ...currentFiles,
          [baseName]: allStats,
        }));
      } else {
        setLoading(true);

        try {
          const dirContents = (await readdir(directory)).filter(
            filterSystemFiles(directory)
          );
          const sortedFiles = await dirContents.reduce(
            async (processedFiles, file) => {
              try {
                const hideEntry =
                  hideFolders &&
                  (await stat(join(directory, file))).isDirectory();
                const newFiles = sortContents(
                  {
                    ...(await processedFiles),
                    ...(!hideEntry && {
                      [file]: await statsWithShortcutInfo(
                        file,
                        await stat(join(directory, file))
                      ),
                    }),
                  },
                  customSortOrder || Object.keys(files || {})
                );

                if (hideLoading) setFiles(newFiles);

                return newFiles;
              } catch {
                return processedFiles;
              }
            },
            Promise.resolve({})
          );

          if (dirContents.length > 0) {
            if (!hideLoading) setFiles(sortedFiles);

            setSortOrder(directory, Object.keys(sortedFiles));
          } else {
            setFiles({});
          }
        } catch (error) {
          if ((error as ApiError).code === "ENOENT") {
            closeProcessesByUrl(directory);
          }
        }

        setLoading(false);
      }
    },
    [
      blurEntry,
      closeProcessesByUrl,
      directory,
      exists,
      files,
      hideFolders,
      hideLoading,
      readdir,
      setSortOrder,
      stat,
      statsWithShortcutInfo,
    ]
  );
  const deleteLocalPath = useCallback(
    async (path: string): Promise<void> => {
      await deletePath(path);
      updateFolder(directory, undefined, basename(path));
    },
    [deletePath, directory, updateFolder]
  );
  const createLink = (contents: Buffer, fileName?: string): void => {
    const link = document.createElement("a");

    link.href = bufferToUrl(contents);
    link.download = fileName || "download.zip";

    link.click();

    setDownloadLink(link.href);
  };
  const getFile = useCallback(
    async (path: string): Promise<ZipFile> => [
      relative(directory, path),
      await readFile(path),
    ],
    [directory, readFile]
  );
  const downloadFiles = useCallback(
    async (paths: string[]): Promise<void> => {
      const allPaths = await findPathsRecursive(paths, readdir, stat);
      const filePaths = await Promise.all(
        allPaths.map((path) => getFile(path))
      );
      const zipFiles = filePaths.filter(Boolean);

      if (zipFiles.length === 1 && extname(zipFiles[0][0])) {
        const [[path, contents]] = zipFiles;

        createLink(contents, basename(path));
      } else {
        const { zip } = await import("fflate");

        zip(
          Object.fromEntries(zipFiles) as AsyncZippable,
          (_zipError, newZipFile) => {
            if (newZipFile) {
              createLink(Buffer.from(newZipFile));
            }
          }
        );
      }
    },
    [getFile, readdir, stat]
  );
  const renameFile = async (path: string, name?: string): Promise<void> => {
    const newName = name?.replace(INVALID_FILE_CHARACTERS, "").trim();

    if (newName) {
      const renamedPath = join(
        directory,
        `${newName}${
          path.endsWith(SHORTCUT_EXTENSION) ? SHORTCUT_EXTENSION : ""
        }`
      );

      if (!(await exists(renamedPath))) {
        await rename(path, renamedPath);
        updateFolder(directory, renamedPath, path);
      }
    }
  };
  const newPath = useCallback(
    async (
      name: string,
      buffer?: Buffer,
      thenRename = false
    ): Promise<void> => {
      const uniqueName = await createPath(name, directory, buffer);

      if (uniqueName && !uniqueName.includes("/")) {
        updateFolder(directory, uniqueName);

        if (thenRename) setRenaming(uniqueName);
        else {
          blurEntry();
          focusEntry(uniqueName);
        }
      }
    },
    [blurEntry, createPath, directory, focusEntry, setRenaming, updateFolder]
  );
  const newShortcut = useCallback(
    (path: string, process: string): void => {
      const pathExtension = extname(path).toLowerCase();

      if (pathExtension === SHORTCUT_EXTENSION) {
        fs?.readFile(path, (_readError, contents = Buffer.from("")) =>
          newPath(basename(path), contents)
        );
      } else {
        const baseName = basename(path);
        const shortcutPath = `${baseName}${SHORTCUT_APPEND}${SHORTCUT_EXTENSION}`;
        const shortcutData = ini.encode(
          {
            BaseURL: process,
            IconFile:
              pathExtension &&
              (process !== "FileExplorer" ||
                MOUNTABLE_EXTENSIONS.has(pathExtension))
                ? getIconByFileExtension(pathExtension)
                : FOLDER_ICON,
            URL: path,
          },
          {
            section: "InternetShortcut",
            whitespace: false,
          }
        );

        newPath(shortcutPath, Buffer.from(shortcutData));
      }
    },
    [fs, newPath]
  );
  const archiveFiles = useCallback(
    async (paths: string[]): Promise<void> => {
      const allPaths = await findPathsRecursive(paths, readdir, stat);
      const filePaths = await Promise.all(
        allPaths.map((path) => getFile(path))
      );
      const zipFiles = filePaths.filter(Boolean);
      const { zip } = await import("fflate");

      zip(
        Object.fromEntries(zipFiles) as AsyncZippable,
        (_zipError, newZipFile) => {
          if (newZipFile) {
            newPath(
              `${basename(directory) || "archive"}.zip`,
              Buffer.from(newZipFile)
            );
          }
        }
      );
    },
    [directory, getFile, newPath, readdir, stat]
  );

  const extractFiles = useCallback(
    async (path: string): Promise<void> => {
      const data = await readFile(path);
      const unzippedFiles =
        extname(path).toLowerCase() === ".rar"
          ? await unrar(data)
          : await unzip(data);
      const zipFolderName = basename(path, extname(path));

      if (await mkdir(join(directory, zipFolderName))) {
        await Promise.all(
          Object.entries(unzippedFiles).map(
            async ([extractPath, fileContents]) => {
              const localPath = join(directory, zipFolderName, extractPath);

              if (fileContents.length === 0 && extractPath.endsWith("/")) {
                await mkdir(localPath);
              } else {
                if (!(await exists(dirname(localPath)))) {
                  await mkdirRecursive(dirname(localPath));
                }

                await writeFile(localPath, Buffer.from(fileContents));
              }
            }
          )
        );

        updateFolder(directory, zipFolderName);
      }
    },
    [
      directory,
      exists,
      mkdir,
      mkdirRecursive,
      readFile,
      updateFolder,
      writeFile,
    ]
  );
  const pasteToFolder = async (): Promise<void> => {
    const pasteEntries = Object.entries(pasteList);
    const moving = pasteEntries.some(([, operation]) => operation === "move");
    const copyFiles = async (entry: string, basePath = ""): Promise<void> => {
      const newBasePath = join(basePath, basename(entry));
      let uniquePath: string;

      if ((await stat(entry)).isDirectory()) {
        uniquePath = await createPath(newBasePath, directory);

        await Promise.all(
          (
            await readdir(entry)
          ).map((dirEntry) => copyFiles(join(entry, dirEntry), uniquePath))
        );
      } else {
        uniquePath = await createPath(
          newBasePath,
          directory,
          await readFile(entry)
        );
      }

      if (!basePath) updateFolder(directory, uniquePath);
    };

    const movedPaths = await Promise.all(
      pasteEntries.map(
        ([pasteEntry]): Promise<string | void> =>
          moving ? createPath(pasteEntry, directory) : copyFiles(pasteEntry)
      )
    );

    if (moving) {
      movedPaths
        .filter(Boolean)
        .forEach((movedPath) => updateFolder(directory, movedPath as string));

      copyEntries([]);
    }
  };

  useEffect(() => {
    if (directory !== currentDirectory) {
      setCurrentDirectory(directory);
      setFiles(NO_FILES);
    }
  }, [currentDirectory, directory]);

  useEffect(() => {
    if (sessionLoaded) {
      if (!files) {
        updateFiles(undefined, undefined, sortOrder);
      } else {
        const fileNames = Object.keys(files);

        if (
          sortOrder &&
          fileNames.length === sortOrder.length &&
          directory === currentDirectory
        ) {
          if (fileNames.some((file) => !sortOrder.includes(file))) {
            const oldName = sortOrder.find(
              (entry) => !fileNames.includes(entry)
            );
            const newName = fileNames.find(
              (entry) => !sortOrder.includes(entry)
            );

            if (oldName && newName) {
              setSortOrder(
                directory,
                sortOrder.map((entry) => (entry === oldName ? newName : entry))
              );
            }
          } else if (
            fileNames.some((file, index) => file !== sortOrder[index])
          ) {
            setFiles((currentFiles) =>
              sortContents(currentFiles || files, sortOrder)
            );
          }
        }
      }
    }
  }, [
    currentDirectory,
    directory,
    files,
    sessionLoaded,
    setSortOrder,
    sortOrder,
    updateFiles,
  ]);

  useEffect(
    () => () => {
      if (downloadLink) cleanUpBufferUrl(downloadLink);
    },
    [downloadLink]
  );

  useEffect(() => {
    addFsWatcher?.(directory, updateFiles);

    return () => removeFsWatcher?.(directory, updateFiles);
  }, [addFsWatcher, directory, removeFsWatcher, updateFiles]);

  return {
    fileActions: {
      archiveFiles,
      deleteLocalPath,
      downloadFiles,
      extractFiles,
      newShortcut,
      renameFile,
    },
    files: files || {},
    folderActions: {
      addToFolder: () => addFile(directory, newPath),
      newPath,
      pasteToFolder,
      resetFiles: () => setFiles(NO_FILES),
      sortByOrder: useSortBy(directory, files),
    },
    isLoading,
    updateFiles,
  };
};

export default useFolder;
