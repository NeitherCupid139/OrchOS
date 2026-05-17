export interface ProjectModel {
  createBody: {
    name: string;
    path: string;
    repositoryUrl?: string;
  };
  updateBody: {
    name?: string;
    path?: string;
    repositoryUrl?: string;
  };
  response: {
    id: string;
    name: string;
    path: string;
    repositoryUrl?: string;
    createdAt: string;
  };
  errorNotFound: { error: "Project not found" };
  successDeleted: { success: true };
  cloneResponse: {
    success: boolean;
    output: string;
    error?: string;
    path: string;
  };
  cloneBody: {
    force?: boolean;
  };
}
